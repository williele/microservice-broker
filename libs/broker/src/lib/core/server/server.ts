import { Broker } from '../broker';
import {
  MiddlewareCompose,
  Middleware,
  MethodInfo,
  ServiceSchema,
} from './interface';
import { BrokerConfig, TransportPacket } from '../interface';
import { Context, defaultContext, defaultResponse, Response } from './context';
import { FORMAT_HTTP_HEADERS } from 'opentracing';
import { promises } from 'fs';
import { compose } from './compose';
import { sendError } from './handlers';
import { BaseSerializer } from '../serializer';
import { createSerializer } from '../serializer/create-serializer';
import { MetadataService, METADATA_SERVICE } from './metadata-service';
import {
  BadRequestError,
  ConfigError,
  HandlerUnimplementError,
} from '../error';
import { RecordStorage } from '../schema';
import { MethodService } from './method-service';
import { dirname, resolve } from 'path';

interface HandlerInfo {
  request: string;
  response?: string;
  description?: string;
  handler: MiddlewareCompose;
}

export class Server {
  public readonly serializer: BaseSerializer;
  private _handlers: Record<string, Record<string, HandlerInfo>> = {};

  // Cached
  private _schema: ServiceSchema;
  private _started = false;

  // Default context
  private readonly _context: Context;
  private readonly _response: Response;

  public readonly storage: RecordStorage;

  constructor(
    public readonly broker: Broker,
    public readonly config: BrokerConfig
  ) {
    this.storage = new RecordStorage(config.server?.records || []);
    this.serializer = createSerializer(config.serializer, this.storage);

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
      throw new ConfigError(`Broker server try to start twice`);
    }

    // Verify schema
    this.storage.verify();
    this.getSchema();
    // Write schema
    if (this.config.server?.schemaFile) {
      await this.schemaFile();
    }

    // This can implement global middlwares
    const handle = compose([this.handle]);
    const subject = `${this.broker.serviceName}_rpc`;

    this.broker.transporter.subscribe(subject, (packet) => {
      const ctx = this.createContext(packet);

      handle(ctx).catch(async (err: Error) => {
        try {
          // Sending error
          await sendError(ctx, err);
        } catch (err) {
          console.error('Unhandle', err);
        }
      });
    });

    this._started = true;
  }

  private async schemaFile() {
    this.config.logger?.log('Write schema file');

    const toPath = resolve(process.cwd(), this.config.server.schemaFile);
    const toDir = dirname(toPath);
    // Create dir
    await promises.mkdir(toDir, { recursive: true });
    await promises.writeFile(toPath, JSON.stringify(this._schema, null, 2));
  }

  /**
   * Handle middleware
   * @param ctx
   */
  private handle: Middleware = async (ctx: Context) => {
    // Extract from header
    const method = ctx.header('method');

    // If request is method
    if (method) {
      const methodInfo = this._handlers['method'][method];
      if (!methodInfo)
        throw new HandlerUnimplementError(`method '${method}' not exists`);
      await methodInfo.handler(ctx);
    }
    // Unknown request
    else throw new BadRequestError('unknown handler');
  };

  /**
   * Create context for handling
   * @param packet
   * @returns
   */
  private createContext(packet: TransportPacket): Context {
    const ctx: Context = Object.create(this._context);
    ctx.packet = packet;
    ctx.extra = {};
    ctx.res = Object.create(this._response);
    ctx.res.header = Object.create(this._response.header);

    // Initialize request span
    ctx.span = this.broker.tracer.extract(FORMAT_HTTP_HEADERS, packet.header);

    return ctx;
  }

  /**
   * Create a subservice
   */
  createService(name: string) {
    return new MethodService(this, name);
  }

  getSchema(): ServiceSchema {
    if (this._schema) return this._schema;

    const methods: Record<string, MethodInfo> = Object.entries(
      this._handlers['method']
    ).reduce((a, [name, info]) => {
      // Hide metadata method
      if (name.startsWith(METADATA_SERVICE)) return a;
      return {
        ...a,
        [name]: {
          request: info.request,
          response: info.response,
          description: info.description || null,
        } as MethodInfo,
      };
    }, {});

    this._schema = {
      serviceName: this.broker.serviceName,
      transporter: this.broker.transporter.transporterName,
      serializer: this.serializer.serializerName,
      records: this.storage.records,
      methods: methods,
    };
    return this._schema;
  }

  addHandler(config: {
    name: string;
    type: string;
    request: string;
    response?: string;
    handler: MiddlewareCompose;
    description?: string;
  }) {
    if (this._started === true) {
      throw new ConfigError(
        `Broker server cannot add new handler after started`
      );
    }

    const { name, type } = config;
    if (this._handlers[type]?.[name]) {
      throw new ConfigError(`Handler ${config.type} '${name}' already exists`);
    }

    if (!this._handlers[type]) {
      this._handlers[type] = {};
    }

    this._handlers[type][name] = {
      request: config.request,
      response: config.response,
      description: config.description,
      handler: config.handler,
    };
  }
}
