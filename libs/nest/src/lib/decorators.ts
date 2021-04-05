import {
  applyDecorators,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { extendArrayMetadata } from './utils/array.utils';
import {
  BROKER_TOKEN,
  COMMAND_TOKEN,
  METHOD_TOKEN,
  MIDDLEWARE_TOKEN,
  SERVICE_TOKEN,
} from './constant';
import { MiddlewareConstructor } from './middleware';
import { CommandConfig, MethodConfig } from './interface';

export function Service() {
  return applyDecorators(Injectable(), SetMetadata(SERVICE_TOKEN, true));
}

export function Method(config: MethodConfig) {
  return SetMetadata(METHOD_TOKEN, config);
}

export function Command(config: CommandConfig) {
  return SetMetadata(COMMAND_TOKEN, config);
}

export function UseMiddleware(...middlewares: MiddlewareConstructor[]) {
  return (target, _key?: string | symbol, descriptor?: PropertyDescriptor) => {
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
