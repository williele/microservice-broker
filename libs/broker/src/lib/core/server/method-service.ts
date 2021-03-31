import { Context } from './context';
import { sendResponse } from './handlers';
import { AddCommandConfig, AddMethodConfig, Middleware } from './interface';
import { Server } from './server';
import { BaseService } from './service';

export class MethodService extends BaseService {
  constructor(server: Server, name: string) {
    super(server, name);
  }

  method(config: AddMethodConfig) {
    const middlewares = this.normalizeMiddlewares(config.middlewares);

    // Add request
    const request = this.server.storage.add(config.request);
    // Add response
    const response = this.server.storage.add(config.response);

    return this.handle({
      ...config,
      type: 'method',
      request,
      response,
      middlewares: [handleMethod(request, response), ...middlewares],
    });
  }

  command(config: AddCommandConfig) {
    const middlewares = this.normalizeMiddlewares(config.middlewares);

    // Add request
    const request = this.server.storage.add(config.request);

    return this.handle({
      ...config,
      type: 'command',
      request,
      middlewares: [handleCommand(request), ...middlewares],
    });
  }
}

/**
 * Decode request body and encode response body
 * If reply exists in header, resend it
 * @param name
 * @param request
 * @param response
 * @returns
 */
function handleMethod(request: string, response: string): Middleware {
  return async (ctx: Context, next) => {
    ctx.body = ctx.serializer.decodeFor(
      'method_request',
      request,
      ctx.packet.body,
      ctx.startSpan('decode request')
    );

    // Set default header
    ctx.setHeader('method', ctx.header('method'));

    await next();

    ctx.res.body = ctx.serializer.encodeFor(
      'method_response',
      response,
      ctx.res.body,
      ctx.startSpan('encode response')
    );

    await sendResponse(ctx);
  };
}

function handleCommand(request: string): Middleware {
  return async (ctx: Context, next) => {
    ctx.body = ctx.serializer.decodeFor(
      'command_request',
      request,
      ctx.packet.body,
      ctx.startSpan('decode request')
    );

    await next();
    // Empty body
    ctx.res.body = Buffer.from([]);

    await sendResponse(ctx);
  };
}
