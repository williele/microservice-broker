import { Module } from '@nestjs/common';
import { BrokerModule } from '@williele/broker-nest';
import { Tracer } from 'opentracing';

import { AppController } from './app.controller';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    SharedModule,
    BrokerModule.forRootAsync({
      import: [SharedModule],
      factory: (tracer: Tracer) => ({
        serviceName: 'gateway',
        serializer: { name: 'arvo' },
        transporter: {
          name: 'nats',
          options: {
            servers: ['http://localhost:4444'],
          },
        },
        tracer,
      }),
      inject: [Tracer],
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
