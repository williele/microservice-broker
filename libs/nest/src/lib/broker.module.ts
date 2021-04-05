import {
  Module,
  DynamicModule,
  Provider,
  ModuleMetadata,
  OnModuleInit,
} from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { InjectorDependency } from '@nestjs/core/injector/injector';
import { Broker, BrokerConfig } from '@williele/broker';
import { BrokerBuilderService } from './broker-builder.service';
import { BrokerServer } from './broker-server';
import { CommandDiscovery } from './discovery/command-discovery.service';
import { MethodDiscovery } from './discovery/method-discovery.service';
import { MiddlewareDiscovery } from './discovery/middleware-discovery.service';

const BROKER_CONFIG_TOKEN = 'BROKER_CONFIG_TOKEN';

@Module({
  imports: [DiscoveryModule],
  providers: [
    BrokerBuilderService,
    MiddlewareDiscovery,
    MethodDiscovery,
    CommandDiscovery,
    BrokerServer,
  ],
  exports: [BrokerServer],
})
export class BrokerModule implements OnModuleInit {
  static forRoot(config: BrokerConfig): DynamicModule {
    const brokerProvider: Provider = {
      provide: Broker,
      useValue: new Broker(config),
    };

    return {
      global: true,
      module: BrokerModule,
      providers: [brokerProvider],
      exports: [Broker],
    };
  }

  static forRootAsync(options: {
    factory: (...args) => BrokerConfig;
    inject: InjectorDependency[];
    import?: ModuleMetadata['imports'];
  }): DynamicModule {
    const brokerProvider: Provider = {
      provide: Broker,
      useExisting: (config: BrokerConfig) => {
        return new Broker(config);
      },
      useFactory: (config: BrokerConfig) => new Broker(config),
      inject: [BROKER_CONFIG_TOKEN],
    };

    return {
      global: true,
      module: BrokerModule,
      imports: options.import || [],
      providers: [
        brokerProvider,
        {
          provide: BROKER_CONFIG_TOKEN,
          useFactory: (...args) => options.factory(...args),
          inject: options.inject,
        },
      ],
      exports: [Broker],
    };
  }

  constructor(private readonly broker: Broker) {}

  async onModuleInit() {
    await this.broker.start();
  }
}
