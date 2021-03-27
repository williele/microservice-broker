import { Context, MiddlewareNext } from '@williele/broker';

export interface Middleware {
  handle(context: Context, next?: MiddlewareNext): Promise<void>;
}

export interface MiddlewareConstructor {
  new (...args): Middleware;
}
