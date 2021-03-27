import { Interceptor } from './interface';
import { composeInterceptor } from './compose';
import { ValidateError } from '../error';

describe('Client interceptor compose', () => {
  it('should compose a success request', async () => {
    const spy = jest.fn();

    const interceptor1: Interceptor = async (_, next) => {
      spy('interceptor 1 start');
      const result = await next();
      spy(`interceptor 1 result`);
      spy({ ...result });
      result['body'] += '1';
      return result;
    };

    const interceptor2: Interceptor = async (_, next) => {
      spy('interceptor 2 start');
      const result = await next();
      spy(`interceptor 2 result`);
      spy({ ...result });
      result['body'] += '2';
      return result;
    };

    const handler: Interceptor = async () => {
      return { body: 'awesome', header: {} };
    };

    const request = composeInterceptor([interceptor1, interceptor2, handler]);
    const response = await request({ body: 'foo', header: {} });
    expect(response).toEqual({ body: 'awesome21', header: {} });

    expect(spy).toHaveBeenNthCalledWith(1, 'interceptor 1 start');
    expect(spy).toHaveBeenNthCalledWith(2, 'interceptor 2 start');
    expect(spy).toHaveBeenNthCalledWith(3, 'interceptor 2 result');
    expect(spy).toHaveBeenNthCalledWith(4, { body: 'awesome', header: {} });
    expect(spy).toHaveBeenNthCalledWith(5, 'interceptor 1 result');
    expect(spy).toHaveBeenNthCalledWith(6, { body: 'awesome2', header: {} });
  });

  it('should compose a error request', () => {
    const spy = jest.fn();

    const interceptor1: Interceptor = async (_, next) => {
      spy('interceptor 1 start');
      const result = await next();
      spy(`interceptor 1 result`);
      spy(result);
      return result;
    };

    const handler: Interceptor = async () => {
      throw ValidateError.constant('dummy');
    };

    const request = composeInterceptor([interceptor1, handler]);
    expect(request({ body: 'foo', header: {} })).rejects.toThrow();
  });
});
