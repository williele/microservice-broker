import { AddMethodConfig, BrokerConfig, BrokerSchema } from './interface';
import { NamedSchemaType } from './schema/interface';
import { Serializer } from './schema/serializer';
import { BrokerSchemaType, NullType } from './constant';
import { BaseTransporter } from './transporter';

export class Broker {
  public readonly serviceName: string;
  private readonly serializer: Serializer;

  private readonly transporter: BaseTransporter;

  private started = false;
  private schema: BrokerSchema;

  private _methods: Record<
    string,
    {
      requestType: string;
      responseType: string;
      handler: CallableFunction;
    }
  > = {};

  constructor(config: BrokerConfig) {
    this.serviceName = config.serviceName;
    this.serializer = config.serializer;

    this.transporter = config.transporter;

    // Add default type
    this.serializer.addType(NullType);
    this.serializer.addType(BrokerSchemaType);
  }

  async start() {
    if (this.started) return;

    // Construct schema
    this.schema = {
      transporter: this.transporter.transporterName,
      types: Object.entries(this.serializer.getTypes()).reduce(
        (a, [name, schema]) => ({ ...a, [name]: JSON.stringify(schema) }),
        {}
      ),
      methods: Object.entries(this._methods).reduce(
        (a, [name, value]) => ({
          ...a,
          [name]: {
            requestType: value.requestType,
            responseType: value.responseType,
          },
        }),
        {}
      ),
    };

    const connection: Promise<unknown>[] = [];

    connection.push(this.transporter.connect());

    await Promise.all(connection);
    this.started = true;
  }

  encode<T>(name: string, val: T, validate?: boolean) {
    return this.serializer.encode<T>(name, val, validate);
  }

  decode<T>(name: string, buffer: Buffer, validate?: boolean) {
    return this.serializer.decode<T>(name, buffer, validate);
  }

  addType(schema: NamedSchemaType) {
    return this.serializer.addType(schema);
  }

  addMethod(config: AddMethodConfig) {
    if (this.started) {
      throw new Error(`Cannot add method after broker is started`);
    }
    if (this._methods[config.name]) {
      throw new Error(`Method ${config.name} already exists`);
    }

    let requestTypename: string;
    if (typeof config.requestType === 'string')
      requestTypename = this.serializer.getType(config.requestType).name;
    else requestTypename = this.serializer.addType(config.requestType);

    let responseTypename: string;
    if (typeof config.responseType === 'string')
      responseTypename = this.serializer.getType(config.responseType).name;
    else responseTypename = this.serializer.addType(config.responseType);

    this._methods[config.name] = {
      requestType: requestTypename,
      responseType: responseTypename,
      handler: config.handler,
    };
  }
}
