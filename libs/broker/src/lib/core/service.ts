import {
  context,
  Context,
  request,
  Request,
  response,
  Response,
} from './context';
import {
  AddMethodConfig,
  HandlerCompose,
  HandlerMiddleware,
  TransportPacket,
} from './interface';
import { BaseSerializer } from './serializer';
import { BaseTransporter } from './transporter';
import { compose } from './utils';

/**
 * A part of broker for handling request
 */
export class Service {
  private _methods: Record<string, HandlerCompose> = {};

  private _context: Context = Object.create({
    ...context,
    serviceName: this.serviceName,
    serializer: this.serializer,
    transporter: this.transporter,
  });

  private _request: Request = Object.create(request);
  private _response: Response = Object.create(response);

  constructor(
    private readonly serviceName: string,
    private readonly transporter: BaseTransporter,
    private readonly serializer: BaseSerializer
  ) {}

  async start() {
    await this.transporter.connect();

    // Subscribe to rpc subject
    this.transporter.subscribe(
      `${this.serviceName}_rpc`,
      this.handle.bind(this)
    );
  }

  private handle(packet: TransportPacket) {
    // Extract from header
    // If request is method
    if (packet.header['method']) {
      this.handleMethod(packet.header['method'], packet);
    }
    // If request is action
    else if (packet.header['action']) {
      //
    }
    // Unknown request
    else {
      // Response unknown request
    }
  }

  private createContext(packet: TransportPacket): Context {
    const context: Context = Object.create(this._context);
    const request: Request = (context.req = Object.create(this._request));
    const response: Response = (context.res = Object.create(this._response));
    // Assign packet
    request.packet = response.packet = context.packet = packet;

    return context;
  }

  private handleMethod(method: string, packet: TransportPacket) {
    const methodFn = this._methods[method];
    if (!method) {
      // Response unimplement error
      return;
    }

    // Unpack request body
    const context = this.createContext(packet);
    methodFn(context).catch((err) => {
      console.log('err', err);
    });
  }

  method(config: AddMethodConfig) {
    if (this._methods[config.name]) {
      throw new Error(`Method ${config.name} already exists`);
    }

    let request: string;
    if (typeof config.request === 'string')
      request = this.serializer.getType(config.request).name;
    else request = this.serializer.addType(config.request);

    let response: string;
    if (typeof config.response === 'string')
      response = this.serializer.getType(config.response).name;
    else response = this.serializer.addType(config.response);

    const stack = config.middlewares
      ? Array.isArray(config.middlewares)
        ? config.middlewares
        : [config.middlewares]
      : [];

    // add default stack
    const fn = compose([
      handleMethod(request, response),
      ...stack,
      config.handler,
    ]);

    this._methods[config.name] = fn;
  }
}

/**
 * Decode request body and encode response body
 * If reply exists in header, resend it
 * @param request
 * @param response
 * @returns
 */
function handleMethod(request: string, response: string): HandlerMiddleware {
  return async (ctx: Context, next) => {
    ctx.req.body = ctx.serializer.decode(request, ctx.packet.body);
    await next();

    const reply = ctx.req.header['reply'];
    if (reply && ctx.res.body) {
      ctx.transporter.send(reply, {
        header: ctx.res.header || {},
        body: ctx.serializer.encode(response, ctx.res.body),
      });
    }
  };
}
