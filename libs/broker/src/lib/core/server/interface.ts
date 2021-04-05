import { NamedRecordType, RecordDefinition } from '../schema';
import { Context } from './context';

export interface MethodInfo {
  request: string;
  response: string;
  description?: string;
  deprecated?: boolean;
}

export interface CommandInfo {
  request: string;
  description?: string;
  deprecated?: boolean;
}

export interface SignalInfo {
  request: string;
  description?: string;
  deprecated?: boolean;
}

export type HandleType = 'method' | 'command' | 'saga';

export interface ServiceSchema {
  serviceName: string;
  transporter: string;
  serializer: string;
  records: Record<string, NamedRecordType>;
  methods: Record<string, MethodInfo>;
  commands: Record<string, CommandInfo>;
  signals: Record<string, SignalInfo>;
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

// Adding handler

interface HandlerBase<I = unknown> {
  name: string;
  description?: string;
  deprecated?: boolean;
  middlewares?: Middleware | Middleware[];
  handler: RequestHandler<I>;
}

export interface AddMethodConfig<I = unknown> extends HandlerBase<I> {
  type: 'method';
  request: RecordDefinition;
  response: RecordDefinition;
}

export interface AddCommandConfig<I = unknown> extends HandlerBase<I> {
  type: 'command';
  request: RecordDefinition;
}

export interface AddSignalConfig<I = unknown>
  extends Omit<HandlerBase<I>, 'description' | 'deprecated'> {
  type: 'signal';
  service: string;
}

export type AddHandlerConfig =
  | AddMethodConfig
  | AddCommandConfig
  | AddSignalConfig;
