import { AddHandlerConfig, HandlerMiddleware } from './interface';
import { verifyName } from '../utils/verify-name';
import { compose } from './compose';
import { Broker } from '../broker';
import { BaseSerializer } from '../serializer';
import { Server } from './server';
import { ConfigError, SchemaError } from '../error';
import { traceHandler } from './handlers';

/**
 * A part of broker for handling request
 */
export class BaseService {
  private _middlewares: HandlerMiddleware[] = [];
  protected readonly serializer: BaseSerializer;
  protected readonly broker: Broker;

  private get enableTracing() {
    return this.server.config.server?.tracing ?? false;
  }

  constructor(
    protected readonly server: Server,
    protected readonly name: string
  ) {
    if (!verifyName(name)) {
      throw new ConfigError(`Service name '${name}' is not valid`);
    }

    this.broker = server.broker;
    this.serializer = this.server.serializer;
  }

  use(...middlewares: HandlerMiddleware[]) {
    this._middlewares.push(...middlewares);
  }

  protected normalizeMiddlewares(
    middlewares: HandlerMiddleware | HandlerMiddleware[]
  ) {
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
    const name = `${this.name}.${config.name}`;

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

  // method(config: AddMethodConfig) {
  //   if (!verifyName(config.name))
  //     throw new ConfigError(`Method name '${config.name}' is not valid`);
  //   const name = `${this.name}.${config.name}`;

  //   const request = this.server.storage.add(config.request);
  //   const response = this.server.storage.add(config.response);

  //   const middlewares = config.middlewares
  //     ? Array.isArray(config.middlewares)
  //       ? config.middlewares
  //       : [config.middlewares]
  //     : [];

  //   // add default stack
  //   const handlers = [
  //     ...this._middlewares,
  //     ...(config.tracing ?? false
  //       ? [traceHandleMethod(name, request, response)]
  //       : []),
  //     handleMethod(request, response),
  //     ...middlewares,
  //     config.handler,
  //   ];

  //   this.server.addMethod({
  //     name,
  //     request,
  //     response,
  //     handler: compose(handlers),
  //     description: config.description,
  //   });
  // }
}
