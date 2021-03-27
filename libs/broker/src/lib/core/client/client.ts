import { Broker } from '../broker';
import { ServiceSchema } from '../server/interface';
import { BaseSerializer } from '../serializer';
import { createSerializer } from '../serializer/create-serializer';
import { BaseTransporter } from '../transporter';
import { BadRequestError } from '../error';
import { RecordStorage } from '../schema';
import { FETCH_SCHEMA_METHOD } from '../server/metadata-service';
import { BrokerConfig } from '../interface';
import { Interceptor, Packet } from './interface';
import { composeInterceptor } from './compose';
import { request, serializeRequest } from './request';

export class Client {
  private schema: ServiceSchema;
  private rpcSubject = `${this.peerService}_rpc`;

  private serializer: BaseSerializer;
  private transporter: BaseTransporter;
  private storage: RecordStorage;

  constructor(
    private readonly broker: Broker,
    config: BrokerConfig,
    private readonly peerService: string
  ) {
    this.storage = new RecordStorage([]);
    this.serializer = createSerializer(config.serializer, this.storage);

    this.transporter = this.broker.transporter;
  }

  private injectMethod(method: string, header: Packet['header'] = {}) {
    header['method'] = method;
    header['service'] = this.broker.serviceName;
  }

  private setSchema(schema: ServiceSchema) {
    this.schema = schema;

    // Parsing serializer
    Object.values(this.schema.records).forEach((type) => {
      this.storage.add(type);
    });
  }

  async fetchSchema(header: Packet['header'] = {}): Promise<ServiceSchema> {
    if (this.schema) return this.schema;

    const compose = composeInterceptor([
      request(this.rpcSubject, this.transporter),
    ]);

    // Inject header
    this.injectMethod(FETCH_SCHEMA_METHOD, header);
    const result = await compose({ body: Buffer.from([]), header });
    if (!(result.body instanceof Buffer)) {
      throw new BadRequestError(`Fetch schema response is not a buffer`);
    }
    this.setSchema(JSON.parse(result.body.toString()));
    return this.schema;
  }

  /**
   * Call a method of current service
   */
  async call<O = unknown>(
    method: string,
    body: unknown,
    header: Packet['header'] = {},
    ...interceptor: Interceptor[]
  ): Promise<Packet<O>> {
    if (!this.schema) await this.fetchSchema(header);

    const info = this.schema.methods[method];
    if (!info)
      throw new BadRequestError(
        `Method '${method}' not exists in '${this.peerService}'`
      );

    const compose = composeInterceptor([
      ...interceptor,
      serializeRequest(this.serializer, info.request, info.response),
      request(this.rpcSubject, this.transporter),
    ]);

    // Inject header
    this.injectMethod(method, header);

    const response = await compose({ body, header });
    return {
      body: response.body as O,
      header: response.header,
    };
  }
}
