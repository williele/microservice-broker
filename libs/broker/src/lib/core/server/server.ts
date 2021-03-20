import { Broker } from '../broker';
import { HandlerCompose, HandlerMiddleware } from './interface';
import { TransportPacket } from '../interface';
import { Service } from './service';
import { Context, defaultContext, defaultResponse, Response } from './context';
import { FORMAT_HTTP_HEADERS } from 'opentracing';
import { compose } from './compose';
import { Null } from '../constant';
import { sendResponse } from './handlers';

interface MethodInfo {
  request: string;
  response: string;
  handler: HandlerCompose;
}

export class Server {
  private _methods: Record<string, MethodInfo> = {};

  // Default context
  private _context: Context;
  private _response: Response;

  constructor(public readonly broker: Broker) {
    // Default context
    this._context = Object.create({
      ...defaultContext,
      serviceName: this.broker.serviceName,
      transporter: this.broker.transporter,
      serializer: this.broker.serializer,
      tracer: this.broker.tracer,
    } as Context);
    // Default response
    this._response = Object.create({
      ...defaultResponse,
      header: {
        transport: this.broker.transporter.transporterName,
        serializer: this.broker.serializer.serializerName,
        service: this.broker.serviceName,
      },
    } as Response);
  }

  async start() {
    // This can implement global middlwares
    const handle = compose([this.handle]);
    const subject = `${this.broker.serviceName}_rpc`;

    this.broker.transporter.subscribe(subject, (packet) => {
      const ctx = this.createContext(packet);

      handle(ctx).catch((err) => {
        const message = err.message;

        ctx.setHeader('error', message);
        ctx.res.body = ctx.serializer.encode(Null.name, {});

        try {
          sendResponse(ctx);
        } catch (err) {
          console.error('Unhandle', err);
        }
      });
    });
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
      request: config.request,
      response: config.response,
      handler: config.handler,
    };
  }
}
