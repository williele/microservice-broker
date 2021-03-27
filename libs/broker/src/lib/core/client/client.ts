import { Tracer, Tags, FORMAT_HTTP_HEADERS, Span } from 'opentracing';
import { Broker } from '../broker';
import { ServiceSchema } from '../server/interface';
import { BaseSerializer, SerializerConfig } from '../serializer';
import { createSerializer } from '../serializer/create-serializer';
import { BaseTransporter } from '../transporter';
import { BadRequestError, BrokerError, BrokerErrorCode } from '../error';
import { spanLogError } from '../error/span';
import { RecordStorage } from '../schema';
import { FETCH_SCHEMA_METHOD } from '../server/metadata-service';

export class Client {
  private schema: ServiceSchema;
  private rpcSubject = `${this.serviceName}_rpc`;

  private serializer: BaseSerializer;
  private transporter: BaseTransporter;
  private tracer: Tracer;
  private storage: RecordStorage;

  constructor(
    private readonly broker: Broker,
    private readonly serviceName: string,
    serializerConfig: SerializerConfig
  ) {
    this.storage = new RecordStorage([]);
    this.serializer = createSerializer(serializerConfig, this.storage);

    this.transporter = this.broker.transporter;
    this.tracer = this.broker.tracer;
  }

  private requestMethod(method: string, body: Buffer, parentSpan?: Span) {
    const header = {
      service: this.broker.serviceName,
      method,
    };

    // Create span
    const span = this.tracer.startSpan('call method', {
      childOf: parentSpan,
    });
    span.setTag(Tags.SPAN_KIND, Tags.SPAN_KIND_RPC_CLIENT);
    span.setTag(Tags.PEER_SERVICE, this.serviceName);
    span.setTag('peer.method', method);
    this.tracer.inject(span.context(), FORMAT_HTTP_HEADERS, header);

    return this.transporter
      .sendRequest(this.rpcSubject, { header, body })
      .then((response) => {
        // Is error
        const errorCode = response.header['error'];

        if (errorCode) {
          throw BrokerError.fromCode(
            errorCode as BrokerErrorCode,
            response.header['error.message']
          );
        } else {
          return response.body;
        }
      })
      .catch((error) => {
        spanLogError(span, error);
        throw error;
      })
      .finally(() => {
        span.finish();
      });
  }

  setSchema(schema: ServiceSchema) {
    this.schema = schema;

    // Parsing serializer
    Object.values(this.schema.records).forEach((type) => {
      this.storage.add(type);
    });
  }

  fetchSchema(parentSpan?: Span): Promise<ServiceSchema> {
    if (this.schema) return Promise.resolve(this.schema);

    const span = this.tracer.startSpan('fetch schema', { childOf: parentSpan });

    return this.requestMethod(FETCH_SCHEMA_METHOD, Buffer.from([]), span)
      .then((body) => {
        this.schema = JSON.parse(body.toString());
        this.setSchema(this.schema);

        return this.schema;
      })
      .catch((error) => {
        spanLogError(span, error);
        throw error;
      })
      .finally(() => {
        span.finish();
      });
  }

  async call<O = unknown>(method: string, val: unknown, parentSpan?: Span) {
    const span = this.tracer.startSpan(`call ${this.serviceName}.${method}`, {
      childOf: parentSpan,
      tags: {
        [Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_CLIENT,
        [Tags.PEER_SERVICE]: this.serviceName,
        'peer.method': method,
      },
    });

    try {
      // If schema not exists then fetch it
      if (!this.schema) await this.fetchSchema(span);

      const methodInfo = this.schema.methods[method];
      if (!methodInfo) {
        throw new BadRequestError(
          `Unknown method '${method}' from '${this.serviceName}' service`
        );
      }

      const body = this.serializer.encodeFor(
        'method_request',
        methodInfo.request,
        val,
        this.tracer.startSpan('encode request', {
          childOf: span,
        })
      );

      const response = await this.requestMethod(method, body, span);
      return this.serializer.decodeFor<O>(
        'method_response',
        methodInfo.response,
        response,
        this.tracer.startSpan('decode response', {
          childOf: span,
        })
      );
    } catch (error) {
      spanLogError(span, error);
      throw error;
    } finally {
      span.finish();
    }
  }
}
