import { Context, HandlerMiddlewareNext } from '../core';

export interface Middleware {
  handle(context: Context, next?: HandlerMiddlewareNext): Promise<void> | void;
}

export interface MiddlewareConstructor {
  new (...args): Middleware;
}
