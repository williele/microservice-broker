import { Tracer, Tags, FORMAT_HTTP_HEADERS, Span } from 'opentracing';
import { Broker } from './broker';
import { Null } from './constant';
import { BrokerSchema } from './interface';
import { BaseSerializer } from './serializer';
import { BrokerSchemaType } from './metadata/metadata-service';
import { BaseTransporter } from './transporter';

export class Client {
  private schema: BrokerSchema;
  private rpcSubject = `${this.serviceName}_rpc`;

  private transporter: BaseTransporter;
  private tracer: Tracer;

  constructor(
    private readonly broker: Broker,
    private readonly serviceName: string,
    private readonly serializer: BaseSerializer
  ) {
    this.transporter = this.broker.transporter;
    this.tracer = this.broker.tracer;
  }

  private requestMethod(method: string, body: Buffer, parentSpan?: Span) {
    const header = {
      service: this.broker.serviceName,
      method,
    };

    // Create span
    const span = this.tracer.startSpan('send_method_request', {
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

  private fetchSchema(parentSpan?: Span) {
    const span = this.tracer.startSpan('fetch_schema', { childOf: parentSpan });

    return this.requestMethod(
      'metadata._schema',
      this.broker.serializer.encode(Null.name, null),
      span
    )
      .then((body) => {
        this.schema = this.broker.serializer.decodeFor(
          'schema',
          BrokerSchemaType.name,
          body,
          this.tracer.startSpan('decode_schema', { childOf: span })
        );

        // Parsing serializer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.values(this.schema.types).forEach((type: any) => {
          this.serializer.record(JSON.parse(type));
        });

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

  async call(method: string, val: unknown, parentSpan?: Span) {
    if (parentSpan) {
      parentSpan.setTag(Tags.SPAN_KIND, Tags.SPAN_KIND_RPC_CLIENT);
      parentSpan.setTag(Tags.PEER_SERVICE, this.serviceName);
      parentSpan.setTag('peer.method', method);
    }

    // If schema not exists then fetch it
    if (!this.schema) await this.fetchSchema(parentSpan);

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
      this.tracer.startSpan('encode_request_body', {
        childOf: parentSpan,
      })
    );

    return this.requestMethod(method, body, parentSpan).then((body) => {
      return this.serializer.decodeFor(
        'method_response',
        methodInfo.response,
        body,
        this.tracer.startSpan('decode_response_body', {
          childOf: parentSpan,
        })
      );
    });
  }
}
