import {
  Middleware,
  MiddlewareCompose,
  MiddlewareNext,
} from '@williele/broker';
import { ConfigError } from '../error';
import type { Context } from './context';

/**
 * Compose middleware returning
 * @param stack
 * @returns
 */
export function compose(stack: Middleware[]): MiddlewareCompose {
  if (!Array.isArray(stack))
    throw new ConfigError('Middleware stack much be an array!');
  for (const fn of stack) {
    if (typeof fn !== 'function')
      throw new ConfigError('Middleware must be composed of functions!');
  }

  return function (ctx: Context, next: MiddlewareNext) {
    let index = -1;
    return dispatch(0);

    function dispatch(i) {
      if (i <= index) {
        return Promise.reject(new ConfigError('next() called multiple times'));
      }

      index = i;
      let fn = stack[i];
      if (i === stack.length) fn = next;
      if (!fn) return Promise.resolve();

      try {
        return Promise.resolve(fn(ctx, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err);
      }
    }
  };
}
