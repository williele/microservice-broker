import { Broker } from '../broker';
import { ServiceSchema } from '../server/interface';
import { BaseSerializer } from '../serializer';
import { createSerializer } from '../serializer/create-serializer';
import { BaseTransporter } from '../transporter';
import { BadRequestError } from '../error';
import { RecordStorage } from '../schema';
import { FETCH_SCHEMA_METHOD } from '../server/metadata-service';
import { BrokerConfig } from '../interface';
import { Interceptor, InterceptorCompose, Packet } from './interface';
import { composeInterceptor } from './compose';
import { request, serializeRequest } from './request';

export class Client {
  private schema: ServiceSchema;
  private rpcSubject = `${this.peerService}_rpc`;

  private serializer: BaseSerializer;
  private transporter: BaseTransporter;
  private storage: RecordStorage;

  private interceptors: Interceptor[] = [];

  // cache
  private methodComposes: Record<string, InterceptorCompose> = {};

  constructor(
    private readonly broker: Broker,
    config: BrokerConfig,
    private readonly peerService: string
  ) {
    this.storage = new RecordStorage([]);
    this.serializer = createSerializer(config.serializer, this.storage);

    this.interceptors.push(...(config.client?.interceptors || []));

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
   * Composing a method handler and cache it for later use
   * @param method
   * @param header
   * @returns
   */
  private async composeMethod(
    method: string,
    header: Packet['header']
  ): Promise<InterceptorCompose> {
    if (this.methodComposes[method]) return this.methodComposes[method];
    if (!this.schema) await this.fetchSchema(header);

    const info = this.schema.methods[method];
    if (!info)
      throw new BadRequestError(
        `Method '${method}' not exists in '${this.peerService}'`
      );

    const compose = composeInterceptor([
      ...this.interceptors,
      serializeRequest(this.serializer, info.request, info.response),
      request(this.rpcSubject, this.transporter),
    ]);
    this.methodComposes[method] = compose;
    return compose;
  }

  /**
   * Call a method of current service
   */
  async call<O = unknown>(
    method: string,
    body: unknown,
    header: Packet['header'] = {}
  ): Promise<Packet<O>> {
    const compose = await this.composeMethod(method, header);
    // Inject header
    this.injectMethod(method, header);

    const response = await compose({ body, header });
    return response as Packet<O>;
  }
}
