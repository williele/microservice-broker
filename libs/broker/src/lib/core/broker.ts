import { Tracer } from 'opentracing';
import { BrokerConfig, ID, TransportPacket } from './interface';
import { BaseTransporter } from './transporter';
import { Client, CommandMessage, Packet } from './client';
import { createTransporter } from './transporter/create-transporter';
import { Server } from './server/server';
import { ConfigError } from './error';
import { OutboxProcessor } from './outbox/procesor';
import { AddHandlerConfig, ServiceSchema } from './server';
import { BrokerClient } from './client/broker-client';
import { Dependencies } from './dependencies';

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
   * Call method
   * @param schema service schema for peer service
   * @param method
   * @param input
   * @param header
   * @returns
   */
  method(
    schema: string,
    method: string,
    input: unknown,
    header: Packet['header'] = {}
  ) {
    return this.createClient(schema).call(method, input, header);
  }

  /**
   * Send a command message
   * @param schema service schema for peer service
   * @param message command message
   * @returns
   */
  command(schema: string, message: CommandMessage) {
    return this.createClient(schema).command(message);
  }

  /**
   * Create a transport packet from this service
   */
  createPacket(
    destinations: string | string[],
    type: string,
    name: string,
    body: Buffer
  ): TransportPacket {
    return {
      header: {
        // This service
        service: this.serviceName,
        // Request informations
        destinations: Array.isArray(destinations)
          ? destinations.join(',')
          : destinations,
        type,
        name,
      },
      body,
    };
  }

  /**
   * Encode a signal record
   * @param name
   * @param val
   * @returns
   */
  encodeSignal<R = unknown>(name: string, val: R) {
    return this.server.encodeSignal(name, val);
  }

  /**
   * Emit to make queue for sending command
   * @param message
   */
  async emitOutbox(message: ID | ID[]) {
    if (this.outboxProcessor) return this.outboxProcessor.add(message);
  }
}
