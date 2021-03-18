import { Module } from '@nestjs/common';

import { BrokerModule, ArvoSerializer, NatsTransporter } from '@wi/broker';

import { AppService } from './app.service';
import { DemoModule } from './demo/demo.module';

@Module({
  imports: [
    BrokerModule.forRoot({
      serviceName: 'test',
      serializer: ArvoSerializer,
      transporter: new NatsTransporter({}),
    }),
    DemoModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
