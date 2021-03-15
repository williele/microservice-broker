import { AddMethodConfig, BrokerConfig } from './interface';
import { NamedSchemaType } from './schema';
import { BrokerSchemaType, NullType } from './constant';
import { BaseTransporter } from './transporter';
import { BaseSerializer } from './serializer';
import { Service } from './service';

export class Broker {
  public readonly serviceName: string;
  private readonly serializer: BaseSerializer;
  private readonly transporter: BaseTransporter;

  private readonly service: Service;

  private started = false;

  constructor(config: BrokerConfig) {
    this.serviceName = config.serviceName;
    this.serializer = new config.serializer();

    this.transporter = config.transporter;

    this.service = new Service(
      this.serviceName,
      this.transporter,
      this.serializer
    );

    // Add default type
    this.serializer.addType(NullType);
    this.serializer.addType(BrokerSchemaType);
  }

  async start() {
    if (this.started) return;

    const connection: Promise<unknown>[] = [];

    connection.push(this.transporter.connect(), this.service.start());

    await Promise.all(connection);
    this.started = true;
  }

  encode<T>(name: string, val: T) {
    return this.serializer.encode<T>(name, val);
  }

  decode<T>(name: string, buffer: Buffer) {
    return this.serializer.decode<T>(name, buffer);
  }

  type(schema: NamedSchemaType) {
    return this.serializer.addType(schema);
  }

  method(config: AddMethodConfig) {
    return this.service.method(config);
  }
}
