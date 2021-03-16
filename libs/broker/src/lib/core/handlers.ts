import { Context } from './context';
import { HandlerMiddleware } from './interface';

/**
 * Helper function for sending response
 * @param ctx
 */
export function sendResponse(ctx: Context) {
  const reply = ctx.header('reply');
  if (!reply) return;
  if (!(ctx.res.body instanceof Buffer)) {
    throw new Error('response is not buffer');
  }

  ctx.transporter.send(reply, {
    header: ctx.res.header,
    body: ctx.res.body,
  });
}

/**
 * Decode request body and encode response body
 * If reply exists in header, resend it
 * @param request
 * @param response
 * @returns
 */
export function handleMethod(
  request: string,
  response: string
): HandlerMiddleware {
  return async (ctx: Context, next) => {
    try {
      ctx.body = ctx.serializer.decode(request, ctx.packet.body);
    } catch {
      throw new Error('Failed to decode request');
    }

    // Set default header
    ctx.setHeader('method', ctx.header('method'));

    await next();

    try {
      ctx.res.body = ctx.serializer.encode(response, ctx.res.body);
    } catch {
      throw new Error('Failed to encode response');
    }
    sendResponse(ctx);
  };
}
