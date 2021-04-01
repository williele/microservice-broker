import { NamedRecordType } from '../schema';
import { Context } from './context';

export interface MethodInfo {
  request: string;
  response: string;
  description?: string;
}

export interface CommandInfo {
  request: string;
  description?: string;
}

export type HandleType = 'method' | 'command' | 'saga';

export interface ServiceSchema {
  serviceName: string;
  transporter: string;
  serializer: string;
  records: Record<string, NamedRecordType>;
  methods: Record<string, MethodInfo>;
  commands: Record<string, CommandInfo>;
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
