import { Tracer } from 'opentracing';
import { BrokerConfig, ID } from './interface';
import { BaseTransporter } from './transporter';
import { Client, CommandMessage, Packet } from './client';
import { createTransporter } from './transporter/create-transporter';
import { Server } from './server/server';
import { ConfigError } from './error';
import { OutboxProcessor } from './outbox/procesor';
import { AddHandlerConfig, ServiceSchema } from './server';
import { BrokerClient } from './client/broker-client';
import { fetchSchema } from './utils/metadata';

export class Broker {
  readonly serviceName: string;
  readonly transporter: BaseTransporter;
  readonly tracer: Tracer;

  readonly outboxProcessor: OutboxProcessor;

  readonly dependencies: Set<string> = new Set();
  readonly dependencySchemas: Record<string, ServiceSchema> = {};

  private readonly server: Server;
  private readonly brokerClient: BrokerClient;
  private readonly clients: Record<string, Client> = {};

  private started = false;

  constructor(private readonly config: BrokerConfig) {
    // Setup service
    this.serviceName = config.serviceName;
    this.transporter = createTransporter(config);

    // Initializer tracer
    this.tracer = config.tracer || new Tracer();

    // Add server
    if (this.config.disableServer !== true) {
      this.server = new Server(this, config);
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
   * Register a client for interact with another service
   * Fetch it's schema and create new client
   * This can useful for broker shorcut such as method, command
   *
   * If service name already
   *
   * If service schema given in broker then directly create client
   * If service schema not given, then fetch it
   */
  addDependency(service: string | ServiceSchema) {
    const name = typeof service === 'string' ? service : service.serviceName;

    if (this.dependencies[name]) return;
    if (typeof service === 'string') this.dependencies.add(service);
    else {
      this.dependencies.add(service.serviceName);
      this.dependencySchemas[service.serviceName] = service;
    }
  }
  addDependencies(services: (string | ServiceSchema)[]) {
    services.forEach((service) => this.addDependency(service));
  }

  /**
   * Get a dependency service schema
   * If schema is not define then go fetch it
   * @param service
   * @returns
   */
  async getDependencySchema(service: string): Promise<ServiceSchema> {
    if (this.dependencySchemas[service]) return this.dependencySchemas[service];
    else {
      const schema = await fetchSchema(service, this.transporter);
      if (!this.dependencies.has(service)) this.dependencies.add(service);
      this.dependencySchemas[service] = schema;
      return schema;
    }
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
    this.clients[serviceName] = new Client(this, this.config, service);
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
    schema: ServiceSchema,
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
  command(schema: ServiceSchema, message: CommandMessage) {
    return this.createClient(schema).command(message);
  }

  /**
   * Emit to make queue for sending command
   * @param message
   */
  async emitOutbox(message: ID | ID[]) {
    if (this.outboxProcessor) return this.outboxProcessor.add(message);
  }
}
