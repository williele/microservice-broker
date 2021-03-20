import { Broker } from '../broker';
import { HandlerCompose, HandlerMiddleware, ServiceSchema } from './interface';
import { TransportPacket } from '../interface';
import { Service } from './service';
import { Context, defaultContext, defaultResponse, Response } from './context';
import { FORMAT_HTTP_HEADERS } from 'opentracing';
import { compose } from './compose';
import { sendResponse } from './handlers';
import { BaseSerializer, SerializerConfig } from '../serializer';
import { createSerializer } from '../serializer/create-serializer';
import { MetadataService } from './metadata/metadata-service';

interface MethodInfo {
  request: string;
  response: string;
  handler: HandlerCompose;
  description?: string;
}

export class Server {
  public readonly serializer: BaseSerializer;
  private _methods: Record<string, MethodInfo> = {};

  // Cached
  private _schema: ServiceSchema;
  private _started = false;

  // Default context
  private _context: Context;
  private _response: Response;

  constructor(
    public readonly broker: Broker,
    serializerConfig: SerializerConfig
  ) {
    this.serializer = createSerializer(serializerConfig);
    // Default type
    this.serializer.record({ name: 'Null', type: 'record', fields: {} });

    // Default context
    this._context = Object.create({
      ...defaultContext,
      serviceName: this.broker.serviceName,
      transporter: this.broker.transporter,
      serializer: this.serializer,
      tracer: this.broker.tracer,
    } as Context);
    // Default response
    this._response = Object.create({
      ...defaultResponse,
      header: {
        transport: this.broker.transporter.transporterName,
        serializer: this.serializer.serializerName,
        service: this.broker.serviceName,
      },
    } as Response);

    // Default services
    new MetadataService(this);
  }

  async start() {
    if (this._started === true) {
      throw new Error(`Broker server try to start twice`);
    }

    // This can implement global middlwares
    const handle = compose([this.handle]);
    const subject = `${this.broker.serviceName}_rpc`;

    this.broker.transporter.subscribe(subject, (packet) => {
      const ctx = this.createContext(packet);

      handle(ctx).catch((err) => {
        const message = err.message;

        ctx.setHeader('error', message);
        ctx.res.body = ctx.serializer.encode('Null', {});

        try {
          sendResponse(ctx);
        } catch (err) {
          console.error('Unhandle', err);
        }
      });
    });

    this._started = true;
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
   * Create context for handling
   * @param packet
   * @returns
   */
  private createContext(packet: TransportPacket): Context {
    const ctx: Context = Object.create(this._context);
    ctx.packet = packet;
    ctx.res = Object.create(this._response);

    // Initialize request span
    ctx.span = this.broker.tracer.extract(FORMAT_HTTP_HEADERS, packet.header);

    return ctx;
  }

  /**
   * Create a subservice
   */
  createService(name: string) {
    return new Service(this, name);
  }

  getSchema(): ServiceSchema {
    if (this._schema) return this._schema;

    const types: Record<string, string> = Object.entries(
      this.serializer.getTypes()
    ).reduce(
      (a, [name, record]) => ({ ...a, [name]: JSON.stringify(record) }),
      {}
    );
    const methods: Record<string, MethodInfo> = Object.entries(
      this._methods
    ).reduce(
      (a, [name, info]) => ({
        ...a,
        [name]: {
          request: info.request,
          response: info.response,
          description: info.description || null,
        } as MethodInfo,
      }),
      {}
    );

    this._schema = {
      transporter: this.broker.transporter.transporterName,
      serializer: this.serializer.serializerName,
      types: types,
      methods: methods,
    };
    return this._schema;
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
    description?: string;
  }) {
    if (this._started === true) {
      throw new Error(`Broker server cannot add new method after started`);
    }

    const { name } = config;
    if (!name) throw new Error(`Method '${name}' already exists`);

    this._methods[name] = {
      request: config.request,
      response: config.response,
      handler: config.handler,
      description: config.description,
    };
  }
}
