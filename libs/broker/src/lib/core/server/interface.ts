import { UsableRecord } from '../interface';
import { Context } from './context';

export interface RequestHandler<I = unknown, O = unknown> {
  (ctx: Context<I, O>): Promise<void> | void;
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

export interface AddMethodConfig {
  name: string;
  request: UsableRecord;
  response: UsableRecord;
  middlewares?: HandlerMiddleware | HandlerMiddleware[];
  handler: RequestHandler;
}
