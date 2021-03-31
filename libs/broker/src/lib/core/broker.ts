import { Tracer } from 'opentracing';
import { BrokerConfig, ID } from './interface';
import { BaseTransporter } from './transporter';
import { Client, CommandMessage } from './client';
import { createTransporter } from './transporter/create-transporter';
import { Server } from './server/server';
import { ConfigError } from './error';
import { OutboxProcessor } from './outbox/procesor';

export class Broker {
  readonly serviceName: string;
  readonly transporter: BaseTransporter;
  readonly tracer: Tracer;

  readonly outboxProcessor: OutboxProcessor;

  private readonly server: Server;

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

    // Add outbox
    if (this.config.outbox) {
      this.outboxProcessor = new OutboxProcessor(this, config);
    }
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
  createClient(service: string) {
    if (this.clients[service]) return this.clients[service];
    this.clients[service] = new Client(this, this.config, service);
    return this.clients[service];
  }

  /**
   * Create a subservice
   * This is can helpful for separate service with
   * difference middlewares logic
   */
  createService(name: string) {
    if (this.config.disableServer === true)
      throw new ConfigError(
        `Cannot create service with config 'disableServer' is true`
      );

    return this.server.createService(name);
  }

  /**
   * Send a command message
   * @param message command message
   * @returns
   */
  command(message: CommandMessage) {
    const client = this.createClient(message.service);
    return client.command(message);
  }

  /**
   * Emit to make queue for sending command
   * @param message
   */
  async emitOutbox(message: ID | ID[]) {
    if (this.outboxProcessor) return this.outboxProcessor.add(message);
  }
}
