import { AddMethodConfig, HandlerMiddleware } from './interface';
import { handleMethod } from './handlers';
import { compose, verifyName } from './utils';
import { Broker } from './broker';
import { BaseSerializer } from './serializer';

/**
 * A part of broker for handling request
 */
export class Service {
  private _middlewares: HandlerMiddleware[] = [];
  private serializer: BaseSerializer;

  constructor(
    protected readonly broker: Broker,
    private readonly name: string
  ) {
    if (!verifyName(name)) {
      throw new Error(`Service name '${name}' is not valid`);
    }

    this.serializer = this.broker.serializer;
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
      handleMethod(request, response),
      ...middlewares,
      config.handler,
    ]);

    this.broker.addMethod({ name, request, response, handler });
  }
}
