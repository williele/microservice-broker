import { TransportPacket } from '../interface';
import { BaseSerializer } from '../serializer';
import { BaseTransporter } from '../transporter';
import { Tracer, SpanContext, Span, SpanOptions } from 'opentracing';
import { InternalError } from '../error';

export interface Context<I = unknown, O = unknown> {
  packet: TransportPacket;
  body: I;
  res: Response<O>;
  span: SpanContext;

  /**
   * Extra information for handler
   * Can use for pass information from middleware
   */
  extra: Record<string, unknown>;

  readonly serviceName: string;
  readonly serializer: BaseSerializer;
  readonly transporter: BaseTransporter;
  readonly tracer: Tracer;

  /**
   * Get list of headers
   */
  headers(): Record<string, string>;

  /**
   * Get a header by name
   * @param name
   * @returns
   */
  header(name: string): string;

  /**
   * Set response header
   * @param name
   * @param val
   */
  setHeader(name: string, val: string): void;

  /**
   * Set response body
   * @param type
   */
  response(type: O): void;

  /**
   * Start new span base on request span
   * @param name
   * @param options
   */
  startSpan(name: string, options?: SpanOptions): Span;

  /**
   * Get extra information
   * @param name
   * @param val
   */
  setExtra(name: string, val: unknown): void;

  /**
   * Get extra information by name
   * @param name
   * @param strict Throw error if extra not exists
   */
  getExtra(name: string, strict?: boolean): unknown;
}

export interface Response<T = unknown> {
  header: Record<string, string>;
  body: T;

  /**
   * Set response header
   * @param name
   * @param val
   */
  setHeader(name: string, val: string): void;
}

export const defaultContext: Context = {
  packet: undefined,
  body: undefined,
  res: undefined,
  span: undefined,

  serviceName: undefined,
  serializer: undefined,
  transporter: undefined,
  tracer: undefined,

  extra: {},

  headers() {
    return this.packet.header || {};
  },

  header(name: string) {
    return this.headers()[name];
  },

  setHeader(name: string, val: string): void {
    this.res.setHeader(name, val);
  },

  response(type): void {
    this.res.body = type;
  },

  startSpan(name: string, options?: SpanOptions) {
    return this.tracer.startSpan(name, {
      childOf: this.span,
      ...(options || {}),
    });
  },

  setExtra(name: string, val: unknown) {
    this.extra[name] = val;
  },

  getExtra(name: string, strict = true): unknown {
    if (this.extra[name]) return this.extra[name];
    if (strict === true)
      throw new InternalError(`Context extra ${name} not found`);
    return null;
  },
};

export const defaultResponse: Response = {
  header: {},
  body: null,

  setHeader(name: string, val: string) {
    this.header[name.toLowerCase().trim()] = val;
  },
};
