import { Context, HandlerMiddlewareNext } from '@williele/broker';

export interface Middleware {
  handle(context: Context, next?: HandlerMiddlewareNext): Promise<void>;
}

export interface MiddlewareConstructor {
  new (...args): Middleware;
}
