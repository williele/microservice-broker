import { NamedRecordType, NamedSchemaType } from './schema/interface';
import { BaseTransporter } from './transporter';
import { BaseSerializer } from './serializer';
import { Context } from './context';

export interface BrokerSchema {
  transporter: string;
  serializer: string;
  types: Record<string, NamedSchemaType>;
  methods: Record<string, MethodInfo>;
}

export interface BrokerConfig {
  serviceName: string;
  serializer: { new (): BaseSerializer };
  transporter: BaseTransporter;
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

export interface AddMethodConfig {
  name: string;
  request: NamedRecordType | string;
  response: NamedRecordType | string;
  middlewares?: HandlerMiddleware | HandlerMiddleware[];
  handler: RequestHandler;
}

export interface TransportPacket {
  header: Record<string, string>;
  body: Buffer;
}
