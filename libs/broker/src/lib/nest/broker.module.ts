import { Module, DynamicModule } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Broker, BrokerConfig } from '../core';
import { BrokerBuilderService } from './broker-builder.service';

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
      providers: [{ provide: Broker, useValue: broker }],
    };
  }
}
