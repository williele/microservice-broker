import {
  applyDecorators,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { extendArrayMetadata } from './utils/array.utils';
import {
  BROKER_TOKEN,
  METHOD_TOKEN,
  MIDDLEWARE_TOKEN,
  SERVICE_TOKEN,
} from './constant';
import { MiddlewareConstructor } from './middleware';
import { MethodConfig } from './interface';

export function Service() {
  return applyDecorators(Injectable(), SetMetadata(SERVICE_TOKEN, true));
}

export function Method(config: MethodConfig) {
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

export const InjectBroker = () => Inject(BROKER_TOKEN);
