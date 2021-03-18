import { Module, DynamicModule } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Broker, BrokerConfig } from '../core';
import { BrokerBuilderService } from './broker-builder.service';
import { BrokerServer } from './broker-server';
import { BROKER_TOKEN } from './constant';

@Module({
  imports: [DiscoveryModule],
  providers: [BrokerBuilderService],
})
export class BrokerModule {
  static forRoot(config: BrokerConfig): DynamicModule {
    const broker = new Broker(config);

    return {
      global: true,
      module: BrokerModule,
      providers: [{ provide: BROKER_TOKEN, useValue: broker }, BrokerServer],
      exports: [BrokerServer],
    };
  }
}
