import { Broker } from './broker';
import { BadResponseError } from './error';
import { BrokerConfig } from './interface';
import { RecordStorage } from './schema';
import { BaseSerializer } from './serializer';
import { createSerializer } from './serializer/create-serializer';
import { ServiceSchema } from './server';
import { subjectRpc } from './utils/subject-name';

/**
 * Dependencies management
 * cache another service schemas and serializers
 */
export class Dependencies {
  private readonly services: Set<string> = new Set();
  private readonly schemas: Record<string, ServiceSchema> = {};
  private readonly serializers: Record<string, BaseSerializer> = {};

  constructor(
    private readonly broker: Broker,
    private readonly _config: BrokerConfig
  ) {}

  private async fetchSchema(service: string): Promise<ServiceSchema> {
    const header = {
      service: this.broker.serviceName,
      type: 'metadata',
      name: 'schema',
    };
    const body = Buffer.from([]);

    const response = await this.broker.transporter.sendRequest(
      subjectRpc(service),
      { header, body }
    );
    if (!(response.body instanceof Buffer)) {
      throw new BadResponseError(`Fetch schema response body is not valid`);
    }

    return JSON.parse(response.body.toString());
  }

  addDependency(service: string | ServiceSchema) {
    if (typeof service === 'string') {
      this.services.add(service);
    } else {
      this.addDependencySchema(service);
    }
  }
  addDependencies(services: (string | ServiceSchema)[]) {
    services.forEach((service) => this.addDependency(service));
  }

  private addDependencySchema(schema: ServiceSchema) {
    this.services.add(schema.serviceName);
    this.schemas[schema.serviceName] = schema;
    const storage = new RecordStorage(Object.values(schema.records));
    this.serializers[schema.serviceName] = createSerializer(
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name: schema.serializer as any,
      },
      storage
    );
  }

  /**
   * Get a dependency service schema
   * If schema is not define then go fetch it
   * @param service
   * @returns
   */
  async getSchema(service: string): Promise<ServiceSchema> {
    if (this.schemas[service]) return this.schemas[service];
    else {
      const schema = await this.fetchSchema(service);
      this.addDependencySchema(schema);
      return schema;
    }
  }

  async getSerializer(service: string): Promise<BaseSerializer> {
    if (this.serializers[service]) return this.serializers[service];
    else {
      await this.getSchema(service);
      return this.serializers[service];
    }
  }
}
