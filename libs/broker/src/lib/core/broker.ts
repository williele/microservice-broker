import { Tracer } from 'opentracing';
import { BrokerConfig } from './interface';
import { BaseTransporter } from './transporter';
import { Client } from './client';
import { createTransporter } from './transporter/create-transporter';
import { Server } from './server/server';
import { ConfigError } from './error';

export class Broker {
  readonly serviceName: string;
  readonly transporter: BaseTransporter;
  readonly tracer: Tracer;

  private readonly server: Server;

  private readonly clients: Record<string, Client> = {};

  private started = false;

  constructor(private readonly config: BrokerConfig) {
    this.serviceName = config.serviceName;
    this.transporter = createTransporter(
      config.serviceName,
      config.transporter
    );

    // Initializer tracer
    this.tracer = config.tracer || new Tracer();

    // Add server
    if (this.config.disableServer !== true)
      this.server = new Server(this, config);
  }

  /**
   * Start broker
   * connect transporter
   * @returns
   */
  async start() {
    if (this.started) return;

    await this.transporter.connect();
    if (this.config.disableServer !== true) await this.server.start();

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
    this.clients[service] = new Client(this, service, this.config.serializer);
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
}
