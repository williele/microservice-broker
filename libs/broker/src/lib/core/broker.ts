import { Tracer } from 'opentracing';
import { BrokerConfig, ID, MessageCallback, MessagePacket } from './interface';
import { BaseTransporter } from './transporter';
import { Client } from './client';
import { createTransporter } from './transporter/create-transporter';
import { Server } from './server/server';
import { BadRequestError, ConfigError } from './error';
import { OutboxProcessor } from './outbox/procesor';
import { AddHandlerConfig, ServiceSchema } from './server';
import { BrokerClient } from './client/broker-client';
import { Dependencies } from './dependencies';
import { subjectRpc } from './utils/subject-name';

export class Broker {
  readonly serviceName: string;
  readonly transporter: BaseTransporter;
  readonly tracer: Tracer;

  readonly outboxProcessor: OutboxProcessor;

  private readonly dependencies: Dependencies;
  private readonly server: Server;
  private readonly brokerClient: BrokerClient;
  private readonly clients: Record<string, Client> = {};

  private started = false;

  constructor(private readonly config: BrokerConfig) {
    // Setup service
    this.serviceName = config.serviceName;
    this.transporter = createTransporter(config);
    this.dependencies = new Dependencies(this, config);

    // Initializer tracer
    this.tracer = config.tracer || new Tracer();

    // Add server
    if (this.config.disableServer !== true) {
      this.server = new Server(this, config, this.dependencies);
    }

    // Broker client
    this.brokerClient = new BrokerClient(this, config, this.server);

    // Add outbox
    if (this.config.outbox) {
      this.outboxProcessor = new OutboxProcessor(this, config);
    }
  }

  /**
   * Get schema of the server
   * @returns
   */
  getSchema() {
    return this.server.getSchema();
  }

  /**
   * Start broker
   * connect transporter
   * @returns
   */
  async start() {
    if (this.started) return;

    await this.transporter.connect();
    if (this.server) await this.server.start();
    if (this.outboxProcessor) await this.outboxProcessor.start();

    // Contruct schema
    this.started = true;
  }

  async destroy() {
    if (!this.started) return;
    await this.transporter.disconnect();

    this.started = false;
  }

  /**
   * Create a client
   * @param service
   * @returns
   */
  createClient(service: string | ServiceSchema): Client {
    const serviceName =
      typeof service === 'string' ? service : service.serviceName;

    if (this.clients[serviceName]) return this.clients[serviceName];
    this.clients[serviceName] = new Client(
      this,
      this.config,
      service,
      this.dependencies
    );
    return this.clients[serviceName];
  }

  /**
   * Add handler
   * @param config
   */
  add(config: AddHandlerConfig) {
    if (!this.server)
      throw new ConfigError(
        `Cannot add handler: Servive broker server is not avaiable`
      );
    return this.server.add(config);
  }

  /**
   * Create a message packet for later send
   * @param destination send to service
   * @param type request type
   * @param name request name
   * @param body
   * @returns
   */
  createMessage(
    destination: string,
    type: 'command' | 'signal',
    name: string,
    body: Buffer
  ): MessagePacket {
    return {
      destination,
      request: `${type}:${name}`,
      header: {},
      payload: body,
    };
  }

  /**
   * Create signal packet
   * @param destination desitination services
   * @param name signal name
   * @param val
   * @returns
   */
  createSignal<R = unknown>(
    destination: string,
    name: string,
    val: R
  ): MessagePacket {
    return this.createMessage(
      destination,
      'signal',
      name,
      this.server.encodeSignal<R>(name, val)
    );
  }

  /**
   * Add signal callback handler
   * @param signal
   * @param handler
   * @returns
   */
  onSignal<R = unknown>(signal: string, handler: MessageCallback<R>) {
    return this.server.onSignal(signal, handler);
  }

  /**
   * Emit to make queue for sending command
   * @param message
   */
  async emitOutbox(message: ID | ID[]) {
    if (this.outboxProcessor) return this.outboxProcessor.add(message);
  }

  async emit(message: MessagePacket) {
    const [type] = message.request.split(':');
    if (type === 'command') {
      return this.createClient(message.destination).command(message);
    } else if (type === 'signal') {
      return this.server.sendSignal(message);
    } else {
      throw new BadRequestError(`Unknown message request type`);
    }
  }
}
