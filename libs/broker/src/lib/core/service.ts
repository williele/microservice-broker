import { AddMethodConfig, HandlerMiddleware } from './interface';
import { handleMethod } from './handlers';
import { compose, verifyName } from './utils';
import { Broker } from './broker';

/**
 * A part of broker for handling request
 */
export class Service {
  private _middlewares: HandlerMiddleware[] = [];

  constructor(
    protected readonly broker: Broker,
    private readonly name: string
  ) {
    if (!verifyName(name)) {
      throw new Error(`Service name '${name}' is not valid`);
    }
  }

  use(...middlewares: HandlerMiddleware[]) {
    this._middlewares.push(...middlewares);
  }

  method(config: AddMethodConfig) {
    if (!verifyName(config.name))
      throw new Error(`Method name '${config.name}' is not valid`);
    const name = `${this.name}.${config.name}`;

    const request =
      typeof config.request === 'string'
        ? this.broker.serializer.getType(config.request).name
        : this.broker.serializer.addType(config.request);

    const response =
      typeof config.response === 'string'
        ? this.broker.serializer.getType(config.response).name
        : this.broker.serializer.addType(config.response);

    const middlewares = config.middlewares
      ? Array.isArray(config.middlewares)
        ? config.middlewares
        : [config.middlewares]
      : [];

    // add default stack
    const handler = compose([
      ...this._middlewares,
      handleMethod(request, response),
      ...middlewares,
      config.handler,
    ]);

    this.broker.addMethod({ name, request, response, handler });
  }
}
