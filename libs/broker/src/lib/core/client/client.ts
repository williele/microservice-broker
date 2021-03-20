import { Tracer, Tags, FORMAT_HTTP_HEADERS, Span } from 'opentracing';
import { Broker } from '../broker';
import { ServiceSchema } from '../server/interface';
import { BaseSerializer, NullRecord, SerializerConfig } from '../serializer';
import { createSerializer } from '../serializer/create-serializer';
import { ServiceSchemaRecord } from '../serializer';
import { BaseTransporter } from '../transporter';

export class Client {
  private schema: ServiceSchema;
  private rpcSubject = `${this.serviceName}_rpc`;

  private serializer: BaseSerializer;
  private transporter: BaseTransporter;
  private tracer: Tracer;

  constructor(
    private readonly broker: Broker,
    private readonly serviceName: string,
    serializerConfig: SerializerConfig
  ) {
    this.serializer = createSerializer(serializerConfig);

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
        const error = response.header['error'];
        if (error) {
          throw new Error(error);
        } else {
          span.setTag('response_body_size', response.body.length);
          return response.body;
        }
      })
      .catch((error) => {
        span.setTag(Tags.ERROR, true);
        span.log({ event: 'error', 'error.kind': error.message });
        throw error;
      })
      .finally(() => {
        span.finish();
      });
  }

  setSchema(schema: ServiceSchema) {
    this.schema = schema;

    // Parsing serializer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.values(this.schema.types).forEach((type: any) => {
      this.serializer.record(JSON.parse(type));
    });
  }

  private fetchSchema(parentSpan?: Span) {
    const span = this.tracer.startSpan('fetch_schema', { childOf: parentSpan });

    return this.requestMethod(
      'metadata._schema',
      this.serializer.encode(NullRecord.name, null),
      span
    )
      .then((body) => {
        this.schema = this.serializer.decodeFor(
          'schema',
          ServiceSchemaRecord.name,
          body,
          this.tracer.startSpan('decode schema', { childOf: span })
        );
        this.setSchema(this.schema);

        return this.schema;
      })
      .catch((error) => {
        span.setTag(Tags.ERROR, true);
        span.log({ event: 'error', 'error.kind': error.message });
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
        throw new Error(
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
    } catch (err) {
      span.setTag(Tags.ERROR, true);
      span.log({ event: 'error', 'error.kind': err.message });
      throw err;
    } finally {
      span.finish();
    }
  }
}
