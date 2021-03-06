import { RecordDefinition } from '../schema';
import { NamedRecordType } from '../schema';
import { Context } from './context';

export interface MethodInfo {
  request: string;
  response: string;
  description?: string;
}

export type HandleType = 'method';

export interface ServiceSchema {
  serviceName: string;
  transporter: string;
  serializer: string;
  records: Record<string, NamedRecordType>;
  methods: Record<string, MethodInfo>;
}

export interface RequestHandler<I = unknown, O = unknown> {
  (ctx: Context<I, O>): Promise<void> | void;
}

export interface HandlerMiddlewareNext {
  (): Promise<void>;
}
export interface HandlerMiddleware {
  (ctx: Context, next: HandlerMiddlewareNext): Promise<void> | void;
}
export interface HandlerCompose {
  (ctx: Context, next?: HandlerMiddlewareNext): Promise<void>;
}

export interface AddHandlerConfig {
  name: string;
  type: HandleType;
  description?: string;
  request?: string;
  response?: string;
  middlewares?: HandlerMiddleware | HandlerMiddleware[];
  handler: RequestHandler;
  tracing?: boolean;
}

export interface AddMethodConfig
  extends Omit<AddHandlerConfig, 'type' | 'request' | 'response'> {
  request: RecordDefinition;
  response: RecordDefinition;
}
