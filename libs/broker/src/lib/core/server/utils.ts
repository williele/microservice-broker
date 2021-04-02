import { BadResponseError, BrokerError, InternalError } from '../error';
import { Context } from './context';
import { Middleware } from './interface';

export function normalizeMiddlewares(
  middlewares: Middleware | Middleware[]
): Middleware[] {
  if (!middlewares) return [];
  return middlewares
    ? Array.isArray(middlewares)
      ? middlewares
      : [middlewares]
    : [];
}

/**
 * Helper function for sending response
 * @param ctx
 */
export function sendResponse(ctx: Context) {
  const reply = ctx.header('reply');
  if (!reply) return;
  if (!(ctx.res.body instanceof Buffer)) {
    throw new BadResponseError('response is not buffer');
  }

  return ctx.transporter.send(reply, {
    header: ctx.res.header,
    body: ctx.res.body,
  });
}

/**
 * Helper function for sending error
 * @param ctx
 * @param err
 * @returns
 */
export function sendError(ctx: Context, err: Error) {
  const error =
    err instanceof BrokerError
      ? err
      : new InternalError(`Unknown error${err.message && `: ${err.message}`}`);

  ctx.setHeader('error', error.code);
  ctx.setHeader('error.message', error.message);
  ctx.response(Buffer.from([]));

  return sendResponse(ctx);
}
