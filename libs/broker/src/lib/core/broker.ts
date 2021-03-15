import {
  AddMethodConfig,
  BrokerConfig,
  BrokerSchema,
  TransportPacket,
} from './interface';
import { NamedSchemaType } from './schema';
import { BrokerSchemaType, NullType } from './constant';
import { BaseTransporter } from './transporter';
import { BaseSerializer } from './serializer';

export class Broker {
  public readonly serviceName: string;
  private readonly serializer: BaseSerializer;
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
    this.serializer = new config.serializer();

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
      serializer: this.serializer.serializerName,
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

    // Start subscribe
    this.transporter.subscribe(
      `${this.serviceName}_schema`,
      (_message, reply) => {
        if (reply) {
          this.transporter.send(reply, {
            header: {
              service: this.serviceName,
            },
            body: this.serializer.encode('BrokerSchemaType', this.schema),
          });
        }
      }
    );
  }

  private handleRequest(packet: TransportPacket, reply?: string) {
    //
  }

  encode<T>(name: string, val: T) {
    return this.serializer.encode<T>(name, val);
  }

  decode<T>(name: string, buffer: Buffer) {
    return this.serializer.decode<T>(name, buffer);
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
