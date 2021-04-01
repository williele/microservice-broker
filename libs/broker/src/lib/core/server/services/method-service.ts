import { Context } from '../context';
import { sendResponse } from '../handlers';
import { Middleware } from '../interface';
import { AddMethodConfig } from './interface';
import { Server } from '../server';
import { BaseService } from './service';

export class MethodService extends BaseService {
  constructor(server: Server, namespace: string) {
    super(server, namespace);
  }

  /**
   * Add a method handler
   * @param config
   * @returns
   */
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
      middlewares: [handleCompose(request, response), ...middlewares],
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
function handleCompose(request: string, response: string): Middleware {
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
