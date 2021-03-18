import { Injectable, OnModuleInit, Type } from '@nestjs/common';
import {
  DiscoveryService,
  MetadataScanner,
  ModuleRef,
  Reflector,
} from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { AddMethodConfig, Broker, HandlerMiddleware } from '../core';
import { METHOD_TOKEN, MIDDLEWARE_TOKEN, SERVICE_TOKEN } from './constant';
import { filterEmpty } from './utils/array.utils';
import { MethodDecoratorConfig } from './decorators';
import { Middleware } from './middleware';

@Injectable()
export class BrokerBuilderService implements OnModuleInit {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly broker: Broker
  ) {}

  async onModuleInit() {
    // Get list of services
    const services = this.scanServices();

    // Scanning method
    for (const s of services) {
      const service = this.broker.createService(s.serviceName);
      const methods = await this.scanMethods(s.provider);
      methods.forEach((m) => service.method(m));
    }
  }

  private scanServices() {
    return this.discovery
      .getProviders()
      .map((provider) => {
        const { instance } = provider;
        if (!instance || !provider.metatype || !provider.host) return undefined;
        const serviceName = this.reflector.get<string>(
          SERVICE_TOKEN,
          provider.metatype
        );
        if (!serviceName) return;

        return { provider, serviceName };
      })
      .filter(filterEmpty);
  }

  private async scanMethods(provider: InstanceWrapper) {
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
      const method = await this.configMethod(name, handler, provider);
      methods.push(method);
    }

    return methods;
  }

  private async configMethod(
    name: string,
    handle: CallableFunction,
    provider: InstanceWrapper
  ) {
    const method: MethodDecoratorConfig = this.reflector.get(
      METHOD_TOKEN,
      handle
    );
    if (!method) return;

    const config: AddMethodConfig = {
      name: method.name || name,
      request: method.request,
      response: method.response,
      middlewares: await this.configMiddleware(handle, provider),
      handler: async (ctx) => {
        const result = await handle(ctx);
        ctx.response(result);
      },
    };

    return config;
  }

  private async configMiddleware(
    handle: CallableFunction,
    provider: InstanceWrapper
  ) {
    const middlewares = this.reflector.get(MIDDLEWARE_TOKEN, handle);
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

      middlewareHandlers.push(instance.handle);
    }

    return middlewareHandlers;
  }
}
