import { Context, defaultContext, defaultResponse, Response } from './context';
import {
  AddMethodConfig,
  HandlerCompose,
  HandlerMiddleware,
  TransportPacket,
} from './interface';
import { handleMethod, sendResponse } from './handlers';
import { BaseSerializer } from './serializer';
import { BaseTransporter } from './transporter';
import { compose } from './utils';

/**
 * A part of broker for handling request
 */
export class Service {
  private _methods: Record<string, HandlerCompose> = {};

  private _middlewares: HandlerMiddleware[] = [];

  private _context: Context = Object.create({
    ...defaultContext,
    serviceName: this.serviceName,
    transporter: this.transporter,
    serializer: this.serializer,
  } as Context);

  private _response: Response = Object.create({
    ...defaultResponse,
    header: {
      service: this.serviceName,
    },
  } as Response);

  constructor(
    private readonly serviceName: string,
    private readonly transporter: BaseTransporter,
    private readonly serializer: BaseSerializer
  ) {}

  async start() {
    await this.transporter.connect();

    // Subscribe to rpc subject
    const fn = compose([...this._middlewares, this.handle]);
    this.transporter.subscribe(`${this.serviceName}_rpc`, (packet) => {
      const ctx = this.createContext(packet);

      fn(ctx).catch((err) => {
        const message = err.message;

        ctx.setHeader('error', message);
        ctx.res.body = ctx.serializer.encode('StringType', message);

        try {
          sendResponse(ctx);
        } catch (err) {
          console.error('Unhandle', err);
        }
      });
    });
  }

  private createContext(packet: TransportPacket): Context {
    const ctx: Context = Object.create(this._context);
    ctx.packet = packet;
    ctx.res = Object.create(this._response);

    return ctx;
  }

  use(...middlewares: HandlerMiddleware[]) {
    this._middlewares.push(...middlewares);
  }

  private handle: HandlerMiddleware = async (ctx: Context) => {
    // Extract from header
    const method = ctx.header('method');

    // If request is method
    if (method) {
      const methodInfo = this._methods[method];
      if (!methodInfo) throw new Error('method not exists');

      await methodInfo(ctx);
    }
    // Unknown request
    // Response unknown request
    else throw new Error('unknown handler');
  };

  method(config: AddMethodConfig) {
    if (this._methods[config.name]) {
      throw new Error(`Method ${config.name} already exists`);
    }

    const reqType =
      typeof config.request === 'string'
        ? this.serializer.getType(config.request).name
        : this.serializer.addType(config.request);

    const resType =
      typeof config.response === 'string'
        ? this.serializer.getType(config.response).name
        : this.serializer.addType(config.response);

    const middlewares = config.middlewares
      ? Array.isArray(config.middlewares)
        ? config.middlewares
        : [config.middlewares]
      : [];

    // add default stack
    const fn = compose([
      handleMethod(reqType, resType),
      ...middlewares,
      config.handler,
    ]);

    this._methods[config.name] = fn;
  }
}
