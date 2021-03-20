import { Tags } from 'opentracing';
import { Context } from './context';
import { AddMethodConfig, HandlerMiddleware } from './interface';

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

  return ctx.transporter.send(reply, {
    header: ctx.res.header,
    body: ctx.res.body,
  });
}

/**
 * Decode request body and encode response body
 * If reply exists in header, resend it
 * @param name
 * @param request
 * @param response
 * @returns
 */
export function handleMethod(
  request: string,
  response: string,
  config: AddMethodConfig
): HandlerMiddleware {
  const { name } = config;

  return async (ctx: Context, next) => {
    const span = ctx.startSpan('handle method', {
      tags: {
        [Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_SERVER,
        'method.name': name,
        'method.request': request,
        'method.response': response,
      },
    });
    ctx.span = span.context();

    try {
      ctx.body = ctx.serializer.decodeFor(
        'method_request',
        request,
        ctx.packet.body,
        ctx.startSpan('decode request', { childOf: span })
      );

      // Set default header
      ctx.setHeader('method', ctx.header('method'));

      await next();

      ctx.res.body = ctx.serializer.encodeFor(
        'method_response',
        response,
        ctx.res.body,
        ctx.startSpan('encode response', { childOf: span })
      );

      await sendResponse(ctx);
      span.finish();
    } catch (err) {
      span.setTag(Tags.ERROR, true);
      span.log({ event: 'error', 'error.kind': err.message });
      span.finish();
      throw err;
    }
  };
}
