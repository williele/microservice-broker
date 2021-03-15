import { Context } from './context';
import {
  HandlerCompose,
  HandlerMiddleware,
  HandlerMiddlewareNext,
} from './interface';

/**
 * Compose middleware returning
 * @param stack
 * @returns
 */
export function compose(stack: HandlerMiddleware[]): HandlerCompose {
  if (!Array.isArray(stack))
    throw new TypeError('Middleware stack much be an array!');
  for (const fn of stack) {
    if (typeof fn !== 'function')
      throw new TypeError('Middleware must be composed of functions!');
  }

  return function (ctx: Context, next: HandlerMiddlewareNext) {
    let index = -1;
    return dispatch(0);

    function dispatch(i) {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'));
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
