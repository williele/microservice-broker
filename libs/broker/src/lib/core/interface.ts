import { NamedSchemaType } from './schema/interface';
import { BaseTransporter } from './transporter';
import { BaseSerializer } from './serializer';
import { Context } from './context';

export interface BrokerSchema {
  transporter: string;
  serializer: string;
  types: Record<string, string>;
  methods: Record<string, { requestType: string; responseType: string }>;
}

export interface BrokerConfig {
  serviceName: string;
  serializer: { new (): BaseSerializer };
  transporter: BaseTransporter;
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
  requestType: NamedSchemaType | string;
  responseType: NamedSchemaType | string;
  middlewares?: HandlerMiddleware | HandlerMiddleware[];
  handler: RequestHandler;
}

export interface TransportPacket {
  header?: Record<string, string>;
  body: Buffer;
}
