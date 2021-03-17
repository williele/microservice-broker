import {
  BrokerConfig,
  BrokerSchema,
  HandlerCompose,
  HandlerMiddleware,
  TransportPacket,
} from './interface';
import { NamedRecordType } from './schema';
import { BaseTransporter } from './transporter';
import { BaseSerializer } from './serializer';
import { Service } from './service';
import { Client } from './client';
import { Context, Response, defaultContext, defaultResponse } from './context';
import { compose } from './utils';
import { sendResponse } from './handlers';
import { MetadataService } from './metadata/metadata-service';
import { Null } from './constant';

export class Broker {
  readonly serviceName: string;
  readonly serializer: BaseSerializer;
  readonly transporter: BaseTransporter;

  // List of methods
  private _methods: Record<
    string,
    { req: string; res: string; handler: HandlerCompose }
  > = {};

  private readonly serializerClass: { new (): BaseSerializer };

  private readonly services: Service[] = [];
  private readonly clients: Record<string, Client> = {};

  private schema: BrokerSchema;
  private started = false;

  // Default context
  private _context: Context;
  private _response: Response;

  constructor(config: BrokerConfig) {
    this.serializerClass = config.serializer;

    this.serviceName = config.serviceName;
    this.serializer = new this.serializerClass();
    this.transporter = config.transporter;

    // Default context
    this._context = Object.create({
      ...defaultContext,
      serviceName: this.serviceName,
      transporter: this.transporter,
      serializer: this.serializer,
    } as Context);
    // Default response
    this._response = Object.create({
      ...defaultResponse,
      header: {
        transport: this.transporter.transporterName,
        serializer: this.serializer.serializerName,
        service: this.serviceName,
      },
    } as Response);

    // Add default type
    this.serializer.record(Null);

    // Add default service
    this.services.push(new MetadataService(this));
  }

  /**
   * Create context for handling
   * @param packet
   * @returns
   */
  private createContext(packet: TransportPacket): Context {
    const ctx: Context = Object.create(this._context);
    ctx.packet = packet;
    ctx.res = Object.create(this._response);

    return ctx;
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
      methods: Object.entries(this._methods).reduce(
        (a, [name, def]) => ({
          ...a,
          [name]: { request: def.req, response: def.res },
        }),
        {}
      ),
    };
    return this.schema;
  }

  /**
   * Handle middleware
   * @param ctx
   */
  private handle: HandlerMiddleware = async (ctx: Context) => {
    // Extract from header
    const method = ctx.header('method');

    // If request is method
    if (method) {
      const methodInfo = this._methods[method];
      if (!methodInfo) throw new Error('method not exists');
      await methodInfo.handler(ctx);
    }
    // Unknown request
    else throw new Error('unknown handler');
  };

  /**
   * Start broker
   * connect transporter
   * @returns
   */
  async start() {
    if (this.started) return;

    await this.transporter.connect();

    const fn = compose([this.handle]);
    const subject = `${this.serviceName}_rpc`;
    this.transporter.subscribe(subject, (packet) => {
      const ctx = this.createContext(packet);

      fn(ctx).catch((err) => {
        const message = err.message;

        ctx.setHeader('error', message);
        ctx.res.body = ctx.serializer.encode('NullType', {});

        try {
          sendResponse(ctx);
        } catch (err) {
          console.error('Unhandle', err);
        }
      });
    });

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
      new this.serializerClass()
    );
    return this.clients[service];
  }

  /**
   * Create a subservice
   * This is can helpful for separate service with
   * difference middlewares logic
   */
  createService(name: string) {
    const service = new Service(this, name);
    this.services.push(service);

    return service;
  }

  /**
   * Add type for schema
   * @param schema
   * @returns
   */
  addRecord(schema: NamedRecordType | { new (...args) }) {
    return this.serializer.record(schema);
  }

  /**
   * Add method
   * @param config
   */
  addMethod(config: {
    name: string;
    request: string;
    response: string;
    handler: HandlerCompose;
  }) {
    const { name } = config;
    if (!name) throw new Error(`Method '${name}' already exists`);

    this._methods[name] = {
      req: config.request,
      res: config.response,
      handler: config.handler,
    };
  }

  encode<T>(name: string, val: T) {
    return this.serializer.encode<T>(name, val);
  }

  decode<T>(name: string, buffer: Buffer) {
    return this.serializer.decode<T>(name, buffer);
  }

  call(service: string, method: string, val: unknown) {
    const client = this.createClient(service);
    return client.call(method, val);
  }
}
