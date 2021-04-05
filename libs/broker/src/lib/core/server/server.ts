import { Broker } from '../broker';
import {
  MiddlewareCompose,
  Middleware,
  MethodInfo,
  ServiceSchema,
  CommandInfo,
  AddHandlerConfig,
  SignalInfo,
} from './interface';
import {
  BrokerConfig,
  MessageCallback,
  MessagePacket,
  TransportPacket,
} from '../interface';
import { Context, defaultContext, defaultResponse, Response } from './context';
import { FORMAT_HTTP_HEADERS } from 'opentracing';
import { promises } from 'fs';
import { compose } from './compose';
import { commandHandler, methodHandler, signalHandler } from './handlers';
import { BaseSerializer } from '../serializer';
import { createSerializer } from '../serializer/create-serializer';
import {
  BadRequestError,
  ConfigError,
  HandlerUnimplementError,
} from '../error';
import { RecordStorage } from '../schema';
import { dirname, resolve } from 'path';
import { normalizeMiddlewares, sendError, sendResponse } from './utils';
import { verifyName } from '../utils/verify-name';
import { subjectRpc } from '../utils/subject-name';
import { Dependencies } from '../dependencies';
import { sendMessage } from '../utils/send-message';

export class Server {
  public readonly serializer: BaseSerializer;

  private _metadataHandlers: Record<string, MiddlewareCompose> = {};

  private _methods: Record<string, MethodInfo> = {};
  private _methodHandlers: Record<string, MiddlewareCompose> = {};

  private _commands: Record<string, CommandInfo> = {};
  private _commandHandlers: Record<string, MiddlewareCompose> = {};

  /**
   * Signal belong to this server
   */
  private _signals: Record<string, SignalInfo> = {};
  private _signalCallbacks: Record<string, MessageCallback> = {};
  private _signalHandlers: Record<
    string,
    Record<string, MiddlewareCompose>
  > = {};

  // Cached
  private _schema: ServiceSchema;
  private _started = false;

  // Default context
  private readonly _context: Context;
  private readonly _response: Response;

  public readonly storage: RecordStorage;

  constructor(
    public readonly broker: Broker,
    public readonly config: BrokerConfig,
    private readonly dependencies: Dependencies
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

    // Add some metadata handler
    this.initMetadataHandler();
  }

  /**
   * Server serve metadata about itself
   * such as service schema
   */
  private initMetadataHandler() {
    this._metadataHandlers = {
      // Serve service schema
      schema: compose([
        // Send schema string directly
        async (ctx) => {
          const schema = this.getSchema();
          const buffer = Buffer.from(JSON.stringify(schema));
          ctx.response(buffer);

          await sendResponse(ctx);
        },
      ]),
    };
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

    if (this.config.server?.signals) {
      // Verify signals
      Object.entries(this.config.server.signals).forEach(([name, config]) => {
        // Verify name
        if (!verifyName(name)) {
          throw new ConfigError(`Signal name '${name}' is not valid`);
        }

        const record = this.storage.add(config.record);
        this._signals[name] = {
          request: record,
          deprecated: config.deprecated,
          description: config.description,
        };
      });
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
    const subject = subjectRpc(this.broker.serviceName);

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
   * Handle rpc request
   * @param ctx
   */
  private handle: Middleware = async (ctx: Context) => {
    // Extract from header
    const service = ctx.header('service');
    const type = ctx.header('type');
    const name = ctx.header('name');

    if (!name) {
      throw new BadRequestError(`missing name header`);
    }

    // Metadata handler
    else if (type === 'metadata') {
      const handler = this._metadataHandlers[name];
      if (!handler)
        throw new HandlerUnimplementError(`Metadata '${name}' is undefined`);
      await handler(ctx);
    }

    // Method handler
    else if (type === 'method') {
      const handler = this._methodHandlers[name];
      if (!handler)
        throw new HandlerUnimplementError(
          `Method '${name}' handler is missing`
        );
      await handler(ctx);
    }

    // Command handler
    else if (type === 'command') {
      const handler = this._commandHandlers[name];
      if (!handler)
        throw new HandlerUnimplementError(
          `Command '${name}' handler is missing`
        );
      await handler(ctx);
    }

    // Signal handler
    else if (type === 'signal') {
      const handler = this._signalHandlers[service]?.[name];
      if (!handler)
        throw new HandlerUnimplementError(
          `Signal handler for '${name}' from '${service}' is missing`
        );
      await handler(ctx);
    }

    // Unknown request
    else throw new BadRequestError('unknown handler');
  };

  /**
   * Encode a signal record
   * @param name
   * @param val
   * @returns
   */
  encodeSignal<R = unknown>(name: string, val: R) {
    if (!this._signals[name]) {
      throw new BadRequestError(
        `Signal '${name}' is undefined. Or broker is not yet start`
      );
    }

    return this.serializer.encodeFor(
      'signal',
      this._signals[name].request,
      val
    );
  }

  /**
   * Send a signal message
   * @param message
   */
  async sendSignal(message: MessagePacket) {
    const [, name] = message.request.split(':');

    if (!this._signals[name]) {
      throw new BadRequestError(`Unknown signal name '${name}'`);
    }

    return sendMessage(
      {
        service: this.broker.serviceName,
        serializer: this.serializer,
        transporter: this.broker.transporter,
      },
      { type: 'signal', name },
      { packet: message, request: this._signals[name].request },
      this._signalCallbacks[name]
    );
  }

  /**
   * Construct a service schema an cache it
   * These service schema only contain useful information for external client
   * @returns Service schema
   */
  getSchema(): ServiceSchema {
    if (this._schema) return this._schema;

    this._schema = {
      serviceName: this.broker.serviceName,
      transporter: this.broker.transporter.transporterName,
      serializer: this.serializer.serializerName,
      records: this.storage.records,
      methods: this._methods,
      commands: this._commands,
      signals: this._signals,
    };
    return this._schema;
  }

  /**
   * Add handler
   * either method, command or signal
   * @param config
   */
  add(config: AddHandlerConfig) {
    const middlewares = normalizeMiddlewares(config.middlewares);
    const name = config.name;
    if (!verifyName(name)) {
      throw new ConfigError(`Handler '${name}' is invalid`);
    }

    // Add method handler
    if (config.type === 'method') {
      if (this._methods[name]) {
        throw new ConfigError(`Method '${name}' already define`);
      }

      const handler = methodHandler(this.storage, config);
      // Information
      this._methods[name] = {
        request: handler.request,
        response: handler.response,
        deprecated: config.deprecated,
        description: config.description,
      };
      // Handler
      this._methodHandlers[name] = compose([
        ...handler.middlewares,
        ...middlewares,
        config.handler,
      ]);
    }

    // Add command handler
    else if (config.type === 'command') {
      if (this._commands[name]) {
        throw new ConfigError(`Command '${name}' already define`);
      }

      const handler = commandHandler(this.storage, config);
      // Information
      this._commands[name] = {
        request: handler.request,
        deprecated: config.deprecated,
        description: config.description,
      };
      // Handler
      this._commandHandlers[name] = compose([
        ...handler.middlewares,
        ...middlewares,
        config.handler,
      ]);
    }

    // Add signal handler
    else if (config.type === 'signal') {
      if (this._signalHandlers[config.service]?.[config.name]) {
        throw new ConfigError(`Signal handler for '${name}' already define`);
      }

      const handler = signalHandler(this.dependencies, config);
      // Handler
      if (!this._signalHandlers[config.service])
        this._signalHandlers[config.service] = {};
      this._signalHandlers[config.service][config.name] = compose([
        ...handler.middlewares,
        ...middlewares,
        config.handler,
      ]);
    }

    // Unknown
    else {
      throw new ConfigError(`Unknown handler type`);
    }
  }

  /**
   * Add signal message callback handler
   * @param signal
   * @param callback
   */
  onSignal<P = unknown>(signal: string, callback: MessageCallback<P>) {
    if (this._signalCallbacks[signal]) {
      throw new ConfigError(
        `Signal '${signal}' callback handler already defined`
      );
    }
    this._signalCallbacks[signal] = callback;
  }
}
