import { Broker } from '../broker';
import { ServiceSchema } from '../server/interface';
import { BaseSerializer } from '../serializer';
import { BaseTransporter } from '../transporter';
import { BadRequestError, ConfigError } from '../error';
import { BrokerConfig, MessageCallback, MessagePacket } from '../interface';
import { Interceptor, InterceptorCompose, Packet } from './interface';
import { composeInterceptor } from './compose';
import { request, serializeRequest } from './request';
import { subjectRpc } from '../utils/subject-name';
import { Dependencies } from '../dependencies';
import { injectHeader } from '../utils/header';
import { sendMessage } from '../utils/send-message';

export class Client {
  private schema: ServiceSchema;
  public readonly peerService: string;
  private rpcSubject: string;

  private serializer: BaseSerializer;
  private transporter: BaseTransporter;

  private interceptors: Interceptor[] = [];

  // cache
  private methodComposes: Record<string, InterceptorCompose> = {};

  // Command handlers
  private commandCallback: Record<string, MessageCallback> = {};

  constructor(
    private readonly broker: Broker,
    config: BrokerConfig,
    service: string | ServiceSchema,
    private readonly dependencies: Dependencies
  ) {
    this.interceptors.push(...(config.client?.interceptors || []));
    this.transporter = this.broker.transporter;

    this.dependencies.addDependency(service);
    if (typeof service === 'string') {
      this.peerService = service;
    } else {
      this.peerService = service.serviceName;
    }

    this.rpcSubject = subjectRpc(this.peerService);
  }

  async getSchema(): Promise<ServiceSchema> {
    if (this.schema) return this.schema;
    else {
      this.schema = await this.dependencies.getSchema(this.peerService);
      this.serializer = await this.dependencies.getSerializer(this.peerService);
      return this.schema;
    }
  }

  /**
   * Composing a method handler and cache it for later use
   * @param method
   * @param header
   * @returns
   */
  private async composeMethod(method: string): Promise<InterceptorCompose> {
    if (this.methodComposes[method]) return this.methodComposes[method];
    if (!this.schema) await this.getSchema();

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
   * Create a command message package
   * @param name command name
   * @param val command request
   * @returns
   */
  async createCommand<R = unknown>(
    name: string,
    val: R
  ): Promise<MessagePacket> {
    if (!this.schema) await this.getSchema();
    const info = this.schema.commands[name];
    if (!info)
      throw new BadRequestError(
        `Command '${name}' not exists in '${this.peerService}'`
      );

    return this.broker.createMessage(
      this.peerService,
      'command',
      name,
      this.serializer.encodeFor('command_request', info.request, val)
    );
  }

  /**
   * Add command callback handlers
   * @param command
   * @param handler
   */
  onCommand<T = unknown>(command: string, handler: MessageCallback<T>) {
    if (this.commandCallback[command])
      throw new ConfigError(
        `Command callback '${command}' of '${this.peerService}' already defined`
      );
    else this.commandCallback[command] = handler;
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
    const compose = await this.composeMethod(method);
    // Inject header
    injectHeader(this.broker.serviceName, 'method', method, header);

    const response = await compose({ body, header });
    return response as Packet<O>;
  }

  /**
   * Send command message to peer service
   * @param message
   */
  async command(message: MessagePacket): Promise<void> {
    const [, name] = message.request.split(':');
    if (!this.schema.commands[name]) {
      throw new BadRequestError(
        `Command not found '${name}' in '${this.peerService}'`
      );
    }

    return sendMessage(
      {
        service: this.broker.serviceName,
        serializer: this.serializer,
        transporter: this.transporter,
      },
      { type: 'command', name },
      {
        packet: message,
        request: this.schema.commands[name].request,
      },
      this.commandCallback[name]
    );
  }
}
