import { Context } from './context';
import {
  AddMethodConfig,
  HandlerCompose,
  HandlerMiddleware,
  RequestHandler,
  TransportPacket,
} from './interface';
import { BaseSerializer } from './serializer';
import { BaseTransporter } from './transporter';
import { compose } from './utils';

interface MethodInfo {
  requestType: string;
  responseType: string;
  stack: HandlerMiddleware[];
  fn?: HandlerCompose;
  handler: RequestHandler;
}

/**
 * A part of broker for handling request
 */
export class Service {
  private _methods: Record<string, MethodInfo> = {};

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

  private handle(packet: TransportPacket, reply?: string) {
    // Extract from header
    // If request is method
    if (packet.header['method']) {
      this.handleMethod(packet.header['method'], packet, reply);
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

  private handleMethod(
    method: string,
    packet: TransportPacket,
    reply?: string
  ) {
    const methodInfo = this._methods[method];
    if (!method) {
      // Response unimplement error
      return;
    }

    // Unpack request body
    const body = this.serializer.decode(methodInfo.requestType, packet.body);
    const context = Context.forMethod({
      header: packet.header,
      body,
    });

    let fn = methodInfo.fn;
    if (!fn) {
      fn = compose([...methodInfo.stack, methodInfo.handler]);
      methodInfo.fn = fn;
    }

    fn(context)
      .then(() => {
        if (!reply || !context.output) return;

        const pack = this.serializer.encode(
          methodInfo.responseType,
          context.output
        );

        this.transporter.send(reply, {
          header: {
            service: this.serviceName,
            method: method,
          },
          body: pack,
        });
      })
      .catch((err) => {
        console.log('err', err);
      });
  }

  method(config: AddMethodConfig) {
    if (this._methods[config.name]) {
      throw new Error(`Method ${config.name} already exists`);
    }

    let requestTypename: string;
    if (typeof config.requestType === 'string')
      requestTypename = this.serializer.getType(config.requestType).name;
    else requestTypename = this.serializer.addType(config.requestType);

    let responseTypename: string;
    if (typeof config.responseType === 'string')
      responseTypename = this.serializer.getType(config.responseType).name;
    else responseTypename = this.serializer.addType(config.responseType);

    const stack = config.middlewares
      ? Array.isArray(config.middlewares)
        ? config.middlewares
        : [config.middlewares]
      : [];

    this._methods[config.name] = {
      requestType: requestTypename,
      responseType: responseTypename,
      stack,
      handler: config.handler,
    };
  }
}
