import { Context } from '../context';
import { sendResponse } from '../handlers';
import { AddCommandConfig, Middleware } from '../interface';
import { Server } from '../server';
import { BaseService } from './service';

export class CommandService extends BaseService {
  constructor(server: Server, namespace: string) {
    super(server, namespace);
  }

  /**
   * Add a command handler
   * @param config
   * @returns
   */
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
