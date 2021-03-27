import { Tags } from 'opentracing';
import { BadResponseError, BrokerError, InternalError } from '../error';
import { spanLogError } from '../error/span';
import { Context } from './context';
import { HandlerMiddleware, HandleType } from './interface';

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

export function traceHandler(
  type: HandleType,
  name: string,
  request?: string,
  response?: string
): HandlerMiddleware {
  return async (ctx: Context, next) => {
    const span = ctx.startSpan(`handle ${type} ${name}`, {
      tags: {
        [Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_SERVER,
        [`${type}.name`]: name,
      },
    });
    if (request) span.setTag(`${type}.request`, request);
    if (response) span.setTag(`${type}.response`, response);
    ctx.span = span.context();

    try {
      await next();
      span.finish();
    } catch (error) {
      spanLogError(span, error);
      span.finish();
      throw error;
    }
  };
}
