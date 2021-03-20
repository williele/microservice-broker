import { AddMethodConfig, HandlerMiddleware } from './interface';
import { handleMethod } from './handlers';
import { verifyName } from '../utils/verify-name';
import { compose } from './compose';
import { Broker } from '../broker';
import { BaseSerializer } from '../serializer';
import { Server } from './server';

/**
 * A part of broker for handling request
 */
export class Service {
  private _middlewares: HandlerMiddleware[] = [];
  protected readonly serializer: BaseSerializer;
  protected readonly broker: Broker;

  constructor(
    protected readonly server: Server,
    private readonly name: string
  ) {
    if (!verifyName(name)) {
      throw new Error(`Service name '${name}' is not valid`);
    }

    this.broker = server.broker;
    this.serializer = this.server.serializer;
  }

  use(...middlewares: HandlerMiddleware[]) {
    this._middlewares.push(...middlewares);
  }

  method(config: AddMethodConfig) {
    if (!verifyName(config.name))
      throw new Error(`Method name '${config.name}' is not valid`);
    const name = `${this.name}.${config.name}`;

    const request = this.serializer.record(config.request);
    const response = this.serializer.record(config.response);

    const middlewares = config.middlewares
      ? Array.isArray(config.middlewares)
        ? config.middlewares
        : [config.middlewares]
      : [];

    // add default stack
    const handler = compose([
      ...this._middlewares,
      handleMethod(request, response, config),
      ...middlewares,
      config.handler,
    ]);

    this.server.addMethod({
      name,
      request,
      response,
      handler,
      description: config.description,
    });
  }
}
