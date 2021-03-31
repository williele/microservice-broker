import { Broker } from '../broker';
import { ServiceSchema } from '../server/interface';
import { BaseSerializer } from '../serializer';
import { createSerializer } from '../serializer/create-serializer';
import { BaseTransporter } from '../transporter';
import { BadRequestError } from '../error';
import { RecordStorage } from '../schema';
import { FETCH_SCHEMA_METHOD } from '../server/metadata-service';
import { BrokerConfig, TransportPacket } from '../interface';
import { Interceptor, InterceptorCompose, Packet } from './interface';
import { composeInterceptor } from './compose';
import { request, serializerCommand, serializeRequest } from './request';

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

  private injectMethod(method: string, header: Packet['header'] = {}) {
    header['method'] = method;
    header['service'] = this.broker.serviceName;
  }

  private injectCommand(command: string, header: Packet['header'] = {}) {
    header['command'] = command;
    header['service'] = this.broker.serviceName;
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

    const compose = composeInterceptor([
      request(this.rpcSubject, this.transporter),
    ]);

    // Inject header
    this.injectMethod(FETCH_SCHEMA_METHOD, header);
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
   */
  async commandPacket(
    command: string,
    body,
    header: Packet['header'] = {}
  ): Promise<{ subject: string; packet: TransportPacket }> {
    if (!this.schema) await this.fetchSchema();

    const info = this.schema.commands[command];
    if (!info)
      throw new BadRequestError(
        `Command '${command}' not exists in '${this.peerService}'`
      );

    this.injectCommand(command, header);
    const buffer = this.serializer.encodeFor(
      'command_request',
      info.request,
      body
    );

    return {
      subject: this.rpcSubject,
      packet: { body: buffer, header },
    };
  }

  private async composeCommand(
    command: string,
    header: Packet['header']
  ): Promise<InterceptorCompose> {
    if (this.commandComposes[command]) return this.commandComposes[command];
    if (!this.schema) await this.fetchSchema(header);

    const info = this.schema.commands[command];
    if (!info)
      throw new BadRequestError(
        `Command '${command}' not exists in '${this.peerService}'`
      );

    const compose = composeInterceptor([
      ...this.interceptors,
      serializerCommand(this.serializer, info.request),
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
    this.injectMethod(method, header);

    const response = await compose({ body, header });
    return response as Packet<O>;
  }

  /**
   * Call a command of current service
   * @param command
   * @param body
   * @param header
   */
  async command(
    command: string,
    body: unknown,
    header: Packet['header'] = {}
  ): Promise<void> {
    const compose = await this.composeCommand(command, header);
    // Inject header
    this.injectCommand(command, header);

    await compose({ body, header });
  }
}
