import { Inject, Injectable, OnModuleInit, Type } from '@nestjs/common';
import {
  DiscoveryService,
  MetadataScanner,
  ModuleRef,
  Reflector,
} from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { AddMethodConfig, Broker, HandlerMiddleware } from '@williele/broker';
import {
  BROKER_TOKEN,
  METHOD_TOKEN,
  MIDDLEWARE_TOKEN,
  SERVICE_TOKEN,
} from './constant';
import { filterEmpty } from './utils/array.utils';
import { MethodDecoratorConfig } from './decorators';
import { Middleware } from './middleware';

@Injectable()
export class BrokerBuilderService implements OnModuleInit {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
    @Inject(BROKER_TOKEN) private readonly broker: Broker
  ) {}

  async onModuleInit() {
    // Get list of services
    const services = this.scanServices();

    // Scanning method
    for (const s of services) {
      const { service } = s;

      const middlewares = await this.configMiddleware(
        s.provider.metatype,
        s.provider
      );
      middlewares.forEach((m) => service.use(m));

      // Scan method
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

        // Creats service
        const service = this.broker.createService(serviceName);

        return { provider, service };
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
      if (method) methods.push(method);
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

    // Bind method instance
    const methodHandler = handle.bind(provider.instance);

    const config: AddMethodConfig = {
      ...method,
      name: method.name || name,
      middlewares: await this.configMiddleware(handle, provider),
      handler: async (ctx) => {
        const result = await methodHandler(ctx);
        ctx.response(result ?? null);
      },
    };

    return config;
  }

  private async configMiddleware(target, provider: InstanceWrapper) {
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

      middlewareHandlers.push(instance.handle);
    }

    return middlewareHandlers;
  }
}
