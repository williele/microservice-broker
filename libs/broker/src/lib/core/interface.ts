import { NamedRecordType, NamedSchemaType } from './schema/interface';
import { TransporterConfig } from './transporter';
import { Context } from './context';
import { SerializerConfig } from './serializer';
import type { Tracer } from 'opentracing';

export interface BrokerSchema {
  transporter: string;
  serializer: string;
  types: Record<string, NamedSchemaType>;
  methods: Record<string, MethodInfo>;
}

export interface BrokerConfig {
  serviceName: string;
  serializer: SerializerConfig;
  transporter: TransporterConfig;
  tracer?: Tracer;
}

export interface MethodInfo {
  request: string;
  response: string;
}

export interface HandlerMiddlewareNext {
  (): Promise<void> | void;
}
export interface HandlerMiddleware {
  (ctx: Context, next: HandlerMiddlewareNext): Promise<void> | void;
}
export interface HandlerCompose {
  (ctx: Context, next?: HandlerMiddlewareNext): Promise<void>;
}

export interface RequestHandler<I = unknown, O = unknown> {
  (ctx: Context<I, O>): Promise<void> | void;
}

export type UsableRecord = NamedRecordType | string | { new (...args) };

export interface AddMethodConfig {
  name: string;
  request: UsableRecord;
  response: UsableRecord;
  middlewares?: HandlerMiddleware | HandlerMiddleware[];
  handler: RequestHandler;
}

export interface TransportPacket {
  header: Record<string, string>;
  body: Buffer;
}
