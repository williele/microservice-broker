import { Injectable } from '@nestjs/common';
import { MetadataScanner, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { AddMethodConfig } from '@williele/broker';
import { METHOD_TOKEN } from '../constant';
import { MethodConfig } from '../interface';
import { filterEmpty } from '../utils/array.utils';
import { MiddlewareDiscovery } from './middleware-discovery.service';

@Injectable()
export class MethodDiscovery {
  constructor(
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly middlewareDicovery: MiddlewareDiscovery
  ) {}

  async scan(provider: InstanceWrapper): Promise<AddMethodConfig[]> {
    const { instance } = provider;
    const prototype = Object.getPrototypeOf(instance);

    const methodConfigs = this.scanner
      .scanFromPrototype(instance, prototype, (name) => ({
        name,
        handler: prototype[name],
        provider,
      }))
      .filter(filterEmpty);

    const methods = [];
    for (const { name, handler, provider } of methodConfigs) {
      const method = await this.config(name, handler, provider);
      if (method) methods.push(method);
    }

    return methods;
  }

  private async config(
    name: string,
    handle: CallableFunction,
    provider: InstanceWrapper
  ): Promise<AddMethodConfig> {
    const method: MethodConfig = this.reflector.get(METHOD_TOKEN, handle);
    if (!method) return;

    // Bind method instance
    const methodHandler = handle.bind(provider.instance);

    return {
      ...method,
      type: 'method',
      name: method.name || name,
      middlewares: await this.middlewareDicovery.scan(handle, provider),
      handler: async (ctx) => {
        const result = await methodHandler(ctx);
        ctx.response(result ?? null);
      },
    };
  }
}
