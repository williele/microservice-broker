import { Middleware } from '../interface';
import { AddHandlerConfig } from './interface';
import { verifyName } from '../../utils/verify-name';
import { compose } from '../compose';
import { Broker } from '../../broker';
import { BaseSerializer } from '../../serializer';
import { Server } from '../server';
import { ConfigError, SchemaError } from '../../error';
import { traceHandler } from '../handlers';

/**
 * A part of broker for handling request
 */
export class BaseService {
  private _middlewares: Middleware[] = [];
  protected readonly serializer: BaseSerializer;
  protected readonly broker: Broker;

  private get enableTracing() {
    return this.server.config.server?.tracing ?? false;
  }

  constructor(
    protected readonly server: Server,
    protected readonly namespace: string
  ) {
    if (!verifyName(namespace)) {
      throw new ConfigError(`Service name '${namespace}' is not valid`);
    }

    this.broker = server.broker;
    this.serializer = this.server.serializer;
  }

  use(...middlewares: Middleware[]) {
    this._middlewares.push(...middlewares);
  }

  protected normalizeMiddlewares(middlewares: Middleware | Middleware[]) {
    if (!middlewares) return [];
    return middlewares
      ? Array.isArray(middlewares)
        ? middlewares
        : [middlewares]
      : [];
  }

  protected handle(config: AddHandlerConfig) {
    if (!verifyName(config.name)) {
      throw new SchemaError(
        `Handle ${config.type} '${config.name}' name is not valid`
      );
    }
    const name = `${this.namespace}.${config.name}`;

    // Add request and response record
    if (config.request && !this.server.storage.has(config.request)) {
      throw new SchemaError(
        `Handle ${config.type} request record '${config.request}' is undefined`
      );
    }
    if (config.response && !this.server.storage.has(config.response)) {
      throw new SchemaError(
        `Handle ${config.type} response record '${config.request}' is undefined`
      );
    }

    // Tracing middleware
    const tracing =
      config.tracing ?? this.enableTracing
        ? [
            traceHandler(
              config.type,
              config.name,
              config.request,
              config.response
            ),
          ]
        : [];

    const handlers = [
      ...this._middlewares,
      ...tracing,
      ...this.normalizeMiddlewares(config.middlewares),
      config.handler,
    ];
    this.server.addHandler({
      type: config.type,
      name: name,
      request: config.request,
      response: config.response,
      description: config.description,
      handler: compose(handlers),
    });
  }
}
