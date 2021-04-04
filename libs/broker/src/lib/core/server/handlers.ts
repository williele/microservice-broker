import { Tags } from 'opentracing';
import { Dependencies } from '../dependencies';
import { ConfigError } from '../error';
import { spanLogError } from '../error/span';
import { RecordStorage } from '../schema';
import { BaseSerializer } from '../serializer';
import { Context } from './context';
import {
  Middleware,
  HandleType,
  AddMethodConfig,
  AddCommandConfig,
  AddSignalConfig,
  ServiceSchema,
} from './interface';
import { sendResponse } from './utils';

/**
 * Method handler middlewares
 * @param storage
 * @param config
 * @returns
 */
export function methodHandler(
  storage: RecordStorage,
  config: AddMethodConfig
): {
  request: string;
  response: string;
  middlewares: Middleware[];
} {
  // Add request
  const request = storage.add(config.request);
  // Add response
  const response = storage.add(config.response);

  // Encode and decode everything
  const middlewar = async (ctx: Context, next) => {
    // Decode request
    ctx.body = ctx.serializer.decodeFor('request', request, ctx.packet.body);
    await next();
    // Encode response
    ctx.res.body = ctx.serializer.encodeFor('response', response, ctx.res.body);
    await sendResponse(ctx);
  };

  return {
    request,
    response,
    middlewares: [middlewar],
  };
}

/**
 * Command handler middlewares
 * @param storage
 * @param config
 * @returns
 */
export function commandHandler(
  storage: RecordStorage,
  config: AddCommandConfig
): {
  request: string;
  middlewares: Middleware[];
} {
  // Add request
  const request = storage.add(config.request);

  // Encode request body and send back empty body
  const middleware = async (ctx: Context, next) => {
    // Decode request
    ctx.body = ctx.serializer.decodeFor('request', request, ctx.packet.body);
    await next();
    // Empty body
    ctx.res.body = Buffer.from([]);
    await sendResponse(ctx);
  };

  return {
    request,
    middlewares: [middleware],
  };
}

export function signalHandler(
  dependencies: Dependencies,
  config: AddSignalConfig
): {
  middlewares: Middleware[];
} {
  // Caches
  let schema: ServiceSchema;
  let serializer: BaseSerializer;

  // Fetch service schema and decode signal request
  const middleware = async (ctx: Context, next) => {
    if (!schema) schema = await dependencies.getSchema(config.service);
    if (!serializer)
      serializer = await dependencies.getSerializer(config.service);

    const signal = schema.signals[config.name];
    // Service schema don't have signal define
    if (!signal) {
      throw new ConfigError(
        `Unknown signal '${config.name}' from service '${config.service}'`
      );
    }

    // Decode
    ctx.body = serializer.decodeFor('request', signal.request, ctx.packet.body);
    await next();
    // Empty body
    ctx.res.body = Buffer.from([]);
    await sendResponse(ctx);
  };

  return {
    middlewares: [middleware],
  };
}

export function traceHandler(
  type: HandleType,
  name: string,
  request?: string,
  response?: string
): Middleware {
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
