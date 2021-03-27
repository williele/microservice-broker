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

export interface MiddlewareNext {
  (): Promise<void>;
}
export interface Middleware {
  (ctx: Context, next: MiddlewareNext): Promise<void> | void;
}
export interface MiddlewareCompose {
  (ctx: Context, next?: MiddlewareNext): Promise<void>;
}

export interface AddHandlerConfig {
  name: string;
  type: HandleType;
  description?: string;
  request?: string;
  response?: string;
  middlewares?: Middleware | Middleware[];
  handler: RequestHandler;
  tracing?: boolean;
}

export interface AddMethodConfig
  extends Omit<AddHandlerConfig, 'type' | 'request' | 'response'> {
  request: RecordDefinition;
  response: RecordDefinition;
}
