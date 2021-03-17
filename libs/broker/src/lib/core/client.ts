import { Broker } from './broker';
import { NullType } from './constant';
import { BrokerSchema } from './interface';
import { BaseSerializer } from './serializer';
import { BrokerSchemaType } from './metadata/metadata-service';

export class Client {
  private schema: BrokerSchema;
  private rpcSubject = `${this.serviceName}_rpc`;

  constructor(
    private readonly broker: Broker,
    private readonly serviceName: string,
    private readonly serializer: BaseSerializer
  ) {}

  private requestMethod(method: string, body: Buffer) {
    return this.broker.transporter
      .sendRequest(this.rpcSubject, {
        header: { service: this.broker.serviceName, method },
        body,
      })
      .then((response) => {
        const error = response.header['error'];
        if (error) {
          throw new Error(error);
        } else {
          return response.body;
        }
      });
  }

  private fetchSchema() {
    return this.requestMethod(
      'metadata._schema',
      this.broker.encode(NullType.name, null)
    ).then((body) => {
      this.schema = this.broker.decode(BrokerSchemaType.name, body);

      // Parsing serializer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.values(this.schema.types).forEach((type: any) => {
        this.serializer.addType(JSON.parse(type));
      });

      return this.schema;
    });
  }

  async call(method: string, val: unknown) {
    // If schema not exists then fetch it
    if (!this.schema) await this.fetchSchema();

    const methodInfo = this.schema.methods[method];
    if (!methodInfo) {
      throw new Error(
        `Unknown method '${method}' from '${this.serviceName}' service`
      );
    }

    let body: Buffer;
    try {
      body = this.serializer.encode(methodInfo.request, val);
    } catch {
      throw new Error('Failed to encode request body');
    }

    return this.requestMethod(method, body).then((body) => {
      try {
        return this.serializer.decode(methodInfo.response, body);
      } catch {
        throw new Error('Failed to decode response body');
      }
    });
  }
}
