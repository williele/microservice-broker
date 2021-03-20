import { UsableRecord } from '../interface';
import { Context } from './context';

export interface MethodInfo {
  request: string;
  response: string;
  description?: string;
}

export interface ServiceSchema {
  transporter: string;
  serializer: string;
  types: Record<string, string>;
  methods: Record<string, MethodInfo>;
  // actions: {request:string}
  // events: {type:string}
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

export interface AddMethodConfig {
  name: string;
  request: UsableRecord;
  response: UsableRecord;
  middlewares?: HandlerMiddleware | HandlerMiddleware[];
  description?: string;
  handler: RequestHandler;
  tracing?: boolean;
}
