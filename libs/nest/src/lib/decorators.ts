import { applyDecorators, Injectable, SetMetadata } from '@nestjs/common';
import { AddMethodConfig } from '@williele/broker';
import { extendArrayMetadata } from './utils/array.utils';
import { METHOD_TOKEN, MIDDLEWARE_TOKEN, SERVICE_TOKEN } from './constant';
import { MiddlewareConstructor } from './middleware';

export function Service(name: string) {
  return applyDecorators(Injectable(), SetMetadata(SERVICE_TOKEN, name));
}

export type MethodDecoratorConfig = Omit<
  AddMethodConfig,
  'name' | 'handler'
> & { name?: string };

export function Method(config: MethodDecoratorConfig) {
  return SetMetadata(METHOD_TOKEN, config);
}

export function UseMiddleware(...middlewares: MiddlewareConstructor[]) {
  return (target, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      extendArrayMetadata(MIDDLEWARE_TOKEN, middlewares, descriptor.value);
      return descriptor;
    } else {
      extendArrayMetadata(MIDDLEWARE_TOKEN, middlewares, target);
      return target;
    }
  };
}
