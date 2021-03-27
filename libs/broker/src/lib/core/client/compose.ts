import { ConfigError } from '../error';
import {
  Interceptor,
  InterceptorCompose,
  InterceptorNext,
  Packet,
} from './interface';

/**
 * Composing interceptor functions
 * @param stack
 * @returns
 */
export function composeInterceptor(stack: Interceptor[]): InterceptorCompose {
  if (!Array.isArray(stack))
    throw new ConfigError(`Interceptor stack much be an array`);
  for (const fn of stack) {
    if (typeof fn !== 'function') {
      throw new ConfigError(`Interceptor much be composed of functions`);
    }
  }

  return function (packet: Packet, next: InterceptorNext) {
    let index = -1;
    let result: Packet;
    return dispatch(0);

    function dispatch(i: number) {
      if (i <= index) {
        return Promise.reject(
          new ConfigError(`Interceptor next() called multiple times`)
        );
      }

      index = i;
      let fn = stack[i];
      if (i === stack.length) fn = next;
      if (!fn) return Promise.resolve(result);

      try {
        return Promise.resolve(fn(packet, dispatch.bind(null, i + 1))).then(
          (packet) => {
            result = packet;
            return packet;
          }
        );
      } catch (err) {
        return Promise.reject(err);
      }
    }
  };
}
