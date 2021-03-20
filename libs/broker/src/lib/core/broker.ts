import { Tracer } from 'opentracing';
import { BrokerConfig, BrokerSchema } from './interface';
import { BaseTransporter } from './transporter';
import { BaseSerializer } from './serializer';
import { Client } from './client';
import { Null } from './constant';
import { createSerializer } from './serializer/create-serializer';
import { createTransporter } from './transporter/create-transporter';
import { Server } from './server/server';

export class Broker {
  readonly serviceName: string;
  readonly serializer: BaseSerializer;
  readonly transporter: BaseTransporter;
  readonly tracer: Tracer;

  private readonly server: Server;

  private readonly clients: Record<string, Client> = {};

  private schema: BrokerSchema;
  private started = false;

  constructor(private readonly config: BrokerConfig) {
    this.serviceName = config.serviceName;
    this.serializer = createSerializer(config.serializer);
    this.transporter = createTransporter(config.transporter);

    // Initializer tracer
    this.tracer = config.tracer || new Tracer();

    // Add server
    this.server = new Server(this);

    // Add default type
    this.serializer.record(Null);
  }

  getSchema() {
    if (this.schema) return this.schema;

    const types = this.serializer.getTypes();
    this.schema = {
      serializer: this.serializer.serializerName,
      transporter: this.transporter.transporterName,
      types: Object.entries(types).reduce(
        (a, [name, def]) => ({ ...a, [name]: JSON.stringify(def) }),
        {}
      ),
      methods: {},
      // methods: Object.entries(this._methods).reduce(
      //   (a, [name, def]) => ({
      //     ...a,
      //     [name]: { request: def.req, response: def.res },
      //   }),
      //   {}
      // ),
    };
    return this.schema;
  }

  /**
   * Start broker
   * connect transporter
   * @returns
   */
  async start() {
    if (this.started) return;

    await this.transporter.connect();
    await this.server.start();

    // Contruct schema
    this.started = true;
  }

  /**
   * Create a client
   * @param service
   * @returns
   */
  createClient(service: string) {
    if (this.clients[service]) return this.clients[service];
    this.clients[service] = new Client(
      this,
      service,
      createSerializer(this.config.serializer)
    );
    return this.clients[service];
  }

  /**
   * Create a subservice
   * This is can helpful for separate service with
   * difference middlewares logic
   */
  createService(name: string) {
    return this.server.createService(name);
  }
}
