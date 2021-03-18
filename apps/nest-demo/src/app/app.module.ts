import { Module } from '@nestjs/common';

import { BrokerModule } from '@wi/broker';

import { AppService } from './app.service';
import { DemoModule } from './demo/demo.module';

@Module({
  imports: [
    BrokerModule.forRoot({
      serviceName: 'test',
      serializer: { name: 'arvo' },
      transporter: { name: 'nats', options: {} },
    }),
    DemoModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
