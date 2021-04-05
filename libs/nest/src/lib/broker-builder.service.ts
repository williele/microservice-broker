import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { Broker } from '@williele/broker';
import { BROKER_TOKEN, SERVICE_TOKEN } from './constant';
import { filterEmpty } from './utils/array.utils';
import { MethodDiscovery } from './discovery/method-discovery.service';
import { MiddlewareDiscovery } from './discovery/middleware-discovery.service';

@Injectable()
export class BrokerBuilderService implements OnModuleInit {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly middlewareDiscovery: MiddlewareDiscovery,
    private readonly methodDiscovery: MethodDiscovery,
    @Inject(BROKER_TOKEN) private readonly broker: Broker
  ) {}

  async onModuleInit() {
    // Get list of services
    const services = this.scanServices();

    // Scanning method
    for (const s of services) {
      // Scan middlewares
      const middlewares = await this.middlewareDiscovery.scan(
        s.provider.metatype,
        s.provider
      );

      // Scan methods
      const methods = await this.methodDiscovery.scan(s.provider);
      methods.forEach((method) =>
        this.broker.add({
          ...method,
          middlewares: middlewares.concat(method.middlewares),
        })
      );

      // Scan commands
    }
  }

  private scanServices() {
    return this.discovery
      .getProviders()
      .map((provider) => {
        const { instance } = provider;
        if (!instance || !provider.metatype || !provider.host) return undefined;
        const service = this.reflector.get<string>(
          SERVICE_TOKEN,
          provider.metatype
        );
        if (!service) return;
        return { provider };
      })
      .filter(filterEmpty);
  }
}
