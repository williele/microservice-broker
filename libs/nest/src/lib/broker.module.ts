import {
  Module,
  DynamicModule,
  Provider,
  ModuleMetadata,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { InjectorDependency } from '@nestjs/core/injector/injector';
import { Broker, BrokerConfig } from '@williele/broker';
import { BrokerBuilderService } from './broker-builder.service';
import { BrokerServer } from './broker-server';
import { BROKER_TOKEN } from './constant';

const BROKER_CONFIG_TOKEN = 'BROKER_CONFIG_TOKEN';

@Module({
  imports: [DiscoveryModule],
  providers: [BrokerBuilderService, BrokerServer],
  exports: [BrokerServer],
})
export class BrokerModule implements OnModuleInit {
  static forRoot(config: BrokerConfig): DynamicModule {
    const broker = new Broker(config);
    const brokerProvider: Provider = {
      provide: BROKER_TOKEN,
      useValue: broker,
    };

    return {
      global: true,
      module: BrokerModule,
      providers: [brokerProvider],
      exports: [BROKER_TOKEN],
    };
  }

  static forRootAsync(options: {
    factory: (...args) => BrokerConfig;
    inject: InjectorDependency[];
    import?: ModuleMetadata['imports'];
  }): DynamicModule {
    const brokerProvider: Provider = {
      provide: BROKER_TOKEN,
      useFactory: (config: BrokerConfig) => new Broker(config),
      inject: [BROKER_CONFIG_TOKEN],
    };

    return {
      global: true,
      module: BrokerModule,
      imports: options.import || [],
      providers: [
        {
          provide: BROKER_CONFIG_TOKEN,
          useFactory: (...args) => options.factory(...args),
          inject: options.inject,
        },
        brokerProvider,
      ],
      exports: [BROKER_TOKEN],
    };
  }

  constructor(@Inject(BROKER_TOKEN) private readonly broker: Broker) {}

  async onModuleInit() {
    await this.broker.start();
  }
}
