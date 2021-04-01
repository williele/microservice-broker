import { Broker } from '../broker';
import {
  MiddlewareCompose,
  Middleware,
  MethodInfo,
  ServiceSchema,
  CommandInfo,
  HandleType,
} from './interface';
import { BrokerConfig, TransportPacket } from '../interface';
import { Context, defaultContext, defaultResponse, Response } from './context';
import { FORMAT_HTTP_HEADERS } from 'opentracing';
import { promises } from 'fs';
import { compose } from './compose';
import { sendError } from './handlers';
import { BaseSerializer } from '../serializer';
import { createSerializer } from '../serializer/create-serializer';
import { MetadataService, METADATA_SERVICE } from './services/metadata-service';
import {
  BadRequestError,
  ConfigError,
  HandlerUnimplementError,
} from '../error';
import { RecordStorage } from '../schema';
import { MethodService } from './services/method-service';
import { dirname, resolve } from 'path';
import { CommandService } from './services/command-service';

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

    // Initialize defualt context properties
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

  /**
   * Broker start
   * Subscribe to rpc subject
   */
  async start() {
    if (this._started === true) {
      // Throw error if server try to start twice
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

    // Subscribe to rpc
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

    // Mark as started
    this._started = true;
  }

  /**
   * Write server schema into file if broker config has set schema file
   */
  private async schemaFile() {
    this.config.logger?.log('Write schema file');

    const toPath = resolve(process.cwd(), this.config.server.schemaFile);
    const toDir = dirname(toPath);
    // Create dir
    await promises.mkdir(toDir, { recursive: true });
    await promises.writeFile(toPath, JSON.stringify(this._schema, null, 2));
  }

  /**
   * Handle rpc request
   * @param ctx
   */
  private handle: Middleware = async (ctx: Context) => {
    // Extract from header
    const method = ctx.header('method');
    const command = ctx.header('command');

    // If request is method
    if (method) {
      const methodInfo = this._handlers['method'][method];
      if (!methodInfo)
        throw new HandlerUnimplementError(`method '${method}' not exists`);
      await methodInfo.handler(ctx);
    } else if (command) {
      const commandInfo = this._handlers['command'][command];
      if (!commandInfo)
        throw new HandlerUnimplementError(`command '${command}' not exists`);
      await commandInfo.handler(ctx);
    }
    // Unknown request
    else throw new BadRequestError('unknown handler');
  };

  /**
   * Create context for handling
   * Each request has separate context
   * Using Object.create for context creation peformance
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
   * Create a sub service by type and namespace
   * @param type
   * @param namespace
   * @returns
   */
  service(type: HandleType, namespace: string) {
    switch (type) {
      case 'method':
        return new MethodService(this, namespace);
      case 'command':
        return new CommandService(this, namespace);
      default:
        throw new ConfigError(`Unknown service type '${type}'`);
    }
  }

  /**
   * Construct a service schema an cache it
   * These service schema only contain useful information for external client
   * @returns Service schema
   */
  getSchema(): ServiceSchema {
    if (this._schema) return this._schema;
    // Construct methods records
    const methods: Record<string, MethodInfo> = Object.entries(
      this._handlers['method'] || {}
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

    // Construct command records
    const commands: Record<string, CommandInfo> = Object.entries(
      this._handlers['command'] || {}
    ).reduce((a, [name, info]) => {
      return {
        ...a,
        [name]: {
          request: info.request,
          description: info.description || null,
        } as CommandInfo,
      };
    }, {});

    this._schema = {
      serviceName: this.broker.serviceName,
      transporter: this.broker.transporter.transporterName,
      serializer: this.serializer.serializerName,
      records: this.storage.records,
      methods: methods,
      commands: commands,
    };
    return this._schema;
  }

  /**
   * Add handler with type
   * @param config
   */
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
