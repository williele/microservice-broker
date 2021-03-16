import {
  AddMethodConfig,
  BrokerConfig,
  BrokerSchema,
  HandlerMiddleware,
} from './interface';
import { NamedRecordType } from './schema';
import { BaseTransporter } from './transporter';
import { BaseSerializer } from './serializer';
import { Service } from './service';
import { BrokerSchemaType, NullType } from './constant';
import { Context } from './context';
import { Client } from './client';

export class Broker {
  public readonly serviceName: string;
  public readonly serializer: BaseSerializer;
  public readonly transporter: BaseTransporter;

  private readonly serializerClass: { new (): BaseSerializer };

  private readonly service: Service;
  private readonly clients: Record<string, Client> = {};

  private schema: BrokerSchema;
  private started = false;

  constructor(config: BrokerConfig) {
    this.serializerClass = config.serializer;

    this.serviceName = config.serviceName;
    this.serializer = new this.serializerClass();

    this.transporter = config.transporter;

    this.service = new Service(
      this.serviceName,
      this.transporter,
      this.serializer
    );

    // Add default type
    this.serializer.addType(NullType);
    this.serializer.addType(BrokerSchemaType);
    // Add default schema resolve
    this.method({
      name: '_schema',
      request: NullType.name,
      response: BrokerSchemaType.name,
      handler: (ctx: Context<null, BrokerSchema>) => {
        ctx.response(this.createSchema());
      },
    });
  }

  async start() {
    if (this.started) return;

    const connection: Promise<unknown>[] = [];
    connection.push(this.transporter.connect(), this.service.start());

    await Promise.all(connection);

    // Contruct schema
    this.started = true;
  }

  private createSchema() {
    if (this.schema) return this.schema;

    const types = this.serializer.getTypes();
    this.schema = {
      serializer: this.serializer.serializerName,
      transporter: this.transporter.transporterName,
      types: Object.entries(types).reduce(
        (a, [name, def]) => ({ ...a, [name]: JSON.stringify(def) }),
        {}
      ),
      methods: this.service.methodInfos,
    };
    return this.schema;
  }

  createClient(service: string) {
    if (this.clients[service]) return this.clients[service];
    this.clients[service] = new Client(
      this,
      service,
      new this.serializerClass()
    );
    return this.clients[service];
  }

  encode<T>(name: string, val: T) {
    return this.serializer.encode<T>(name, val);
  }

  decode<T>(name: string, buffer: Buffer) {
    return this.serializer.decode<T>(name, buffer);
  }

  type(schema: NamedRecordType) {
    return this.serializer.addType(schema);
  }

  use(...middlewares: HandlerMiddleware[]) {
    this.service.use(...middlewares);
  }

  method(config: AddMethodConfig) {
    return this.service.method(config);
  }

  call(service: string, method: string, val: unknown) {
    const client = this.createClient(service);
    return client.call(method, val);
  }
}
