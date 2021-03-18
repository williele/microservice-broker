import { Context, HandlerMiddlewareNext } from '../core';

export abstract class Middleware {
  abstract handle(
    context: Context,
    next?: HandlerMiddlewareNext
  ): Promise<void> | void;
}

export interface MiddlewareConstructor {
  new (...args): Middleware;
}
