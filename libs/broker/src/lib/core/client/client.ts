import { Broker } from '../broker';
import { ServiceSchema } from '../server/interface';
import { BaseSerializer } from '../serializer';
import { createSerializer } from '../serializer/create-serializer';
import { BaseTransporter } from '../transporter';
import {
  BadRequestError,
  BrokerError,
  clientCauseErrors,
  ConfigError,
  DuplicateError,
} from '../error';
import { RecordStorage } from '../schema';
import { BrokerConfig } from '../interface';
import {
  CommandHandler,
  CommandMessage,
  Interceptor,
  InterceptorCompose,
  Packet,
} from './interface';
import { composeInterceptor } from './compose';
import { request, serializeRequest } from './request';

export class Client {
  private schema: ServiceSchema;
  private rpcSubject = `${this.peerService}_rpc`;

  private serializer: BaseSerializer;
  private transporter: BaseTransporter;
  private storage: RecordStorage;

  private interceptors: Interceptor[] = [];

  // cache
  private methodComposes: Record<string, InterceptorCompose> = {};
  private commandComposes: Record<string, InterceptorCompose> = {};

  private commandHandlers: Record<string, CommandHandler> = {};

  constructor(
    private readonly broker: Broker,
    config: BrokerConfig,
    private readonly peerService: string
  ) {
    this.storage = new RecordStorage([]);
    this.serializer = createSerializer(config.serializer, this.storage);

    this.interceptors.push(...(config.client?.interceptors || []));

    this.transporter = this.broker.transporter;
  }

  /**
   * Inject conventional header for sending request
   * @param type
   * @param name
   * @param header
   */
  private injectHeader(
    type: string,
    name: string,
    header: Packet['header'] = {}
  ) {
    header['service'] = this.broker.serviceName;
    header['type'] = type;
    header['name'] = name;
  }

  private setSchema(schema: ServiceSchema) {
    this.schema = schema;

    // Parsing serializer
    Object.values(this.schema.records).forEach((type) => {
      this.storage.add(type);
    });
  }

  async fetchSchema(header: Packet['header'] = {}): Promise<ServiceSchema> {
    if (this.schema) return this.schema;

    // Start broker first
    await this.broker.start();

    const compose = composeInterceptor([
      request(this.rpcSubject, this.transporter),
    ]);

    // Inject header
    this.injectHeader('metadata', 'schema', header);

    const result = await compose({ body: Buffer.from([]), header });
    if (!(result.body instanceof Buffer)) {
      throw new BadRequestError(`Fetch schema response is not a buffer`);
    }
    this.setSchema(JSON.parse(result.body.toString()));

    return this.schema;
  }

  /**
   * Composing a method handler and cache it for later use
   * @param method
   * @param header
   * @returns
   */
  private async composeMethod(
    method: string,
    header: Packet['header']
  ): Promise<InterceptorCompose> {
    if (this.methodComposes[method]) return this.methodComposes[method];
    if (!this.schema) await this.fetchSchema(header);

    const info = this.schema.methods[method];
    if (!info)
      throw new BadRequestError(
        `Method '${method}' not exists in '${this.peerService}'`
      );

    const compose = composeInterceptor([
      ...this.interceptors,
      serializeRequest(this.serializer, info.request, info.response),
      request(this.rpcSubject, this.transporter),
    ]);
    this.methodComposes[method] = compose;
    return compose;
  }

  /**
   * Create a command packet
   * which can store into outbox for later requestRaw
   * or send rightaway to command method
   */
  async commandMessage(
    command: string,
    body,
    header: Packet['header'] = {}
  ): Promise<CommandMessage> {
    if (!this.schema) await this.fetchSchema();

    const info = this.schema.commands[command];
    if (!info)
      throw new BadRequestError(
        `Command '${command}' not exists in '${this.peerService}'`
      );

    const buffer = this.serializer.encodeFor(
      'command_request',
      info.request,
      body
    );

    return {
      service: this.peerService,
      command,
      body: buffer,
      header,
    };
  }

  /**
   * Add a command handler, receive message and en error if error as arguments
   * @param command
   * @param handler
   */
  commandHandler<T = unknown>(command: string, handler: CommandHandler<T>) {
    if (this.commandHandlers[command])
      throw new ConfigError(`Command handler '${command}' already exists`);
    this.commandHandlers[command] = handler;
  }

  private async composeCommand(
    command: string,
    header: Packet['header'] = {}
  ): Promise<InterceptorCompose> {
    if (this.commandComposes[command]) return this.commandComposes[command];
    if (!this.schema) await this.fetchSchema(header);

    const compose = composeInterceptor([
      ...this.interceptors,
      request(this.rpcSubject, this.transporter),
    ]);
    this.commandComposes[command] = compose;
    return compose;
  }

  /**
   * Call a method of current service
   * @param method
   * @param body
   * @param header
   */
  async call<O = unknown>(
    method: string,
    body: unknown,
    header: Packet['header'] = {}
  ): Promise<Packet<O>> {
    const compose = await this.composeMethod(method, header);
    // Inject header
    this.injectHeader('method', method, header);

    const response = await compose({ body, header });
    return response as Packet<O>;
  }

  /**
   * Send command message to peer service
   * @param command
   * @param body
   * @param header
   */
  async command(message: CommandMessage): Promise<void> {
    const { service, command, body, header } = message;
    if (this.peerService !== service)
      throw new BadRequestError(
        `Client '${this.peerService}' cannot send command to '${service}'`
      );

    const compose = await this.composeCommand(command, header);
    // Inject header
    this.injectHeader('command', command, header);
    const handler = this.commandHandlers[message.command];

    // Decode the header
    let request;
    if (handler) {
      request = this.serializer.decode(
        this.schema.commands[command].request,
        body
      );
    }

    try {
      await compose({ body, header });
      if (handler) await handler(request);
    } catch (err) {
      // Ignore if error is duplicate
      if (err instanceof DuplicateError) return;
      else if (
        err instanceof BrokerError &&
        clientCauseErrors.includes(err.code)
      ) {
        if (handler) await handler(request, err);
        else return;
      } else {
        throw err;
      }
    }
  }
}
