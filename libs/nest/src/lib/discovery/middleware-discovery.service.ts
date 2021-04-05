import { Injectable, Type } from '@nestjs/common';
import { Reflector, ModuleRef } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Middleware as HandlerMiddleware } from '@williele/broker';
import { MIDDLEWARE_TOKEN } from '../constant';
import { Middleware } from '../middleware';

@Injectable()
export class MiddlewareDiscovery {
  constructor(private readonly reflector: Reflector) {}

  async scan(target, provider: InstanceWrapper) {
    const middlewares = this.reflector.get(MIDDLEWARE_TOKEN, target);
    if (!middlewares) return [];

    const host = provider.host;
    const ModuleRef: Type<ModuleRef> = host.createModuleReferenceType();
    const moduleRef = new ModuleRef();

    const middlewareHandlers: HandlerMiddleware[] = [];
    for (const m of middlewares) {
      let instance: Middleware;

      if (!host.hasProvider(m)) {
        instance = await moduleRef.create(m);
        host.addProvider({ provide: m, useValue: instance });
      } else instance = moduleRef.get(m);

      middlewareHandlers.push(instance.handle.bind(instance));
    }

    return middlewareHandlers;
  }
}
