import { Logger, Module } from '@nestjs/common';
import { BrokerModule } from '@williele/broker-nest';
import { Tracer } from 'opentracing';

import { AppController } from './app.controller';
import { OutboxService } from './shared/outbox.service';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    BrokerModule.forRootAsync({
      import: [SharedModule],
      factory: (tracer: Tracer, outbox: OutboxService) => ({
        serviceName: 'gateway',
        serializer: { name: 'arvo' },
        transporter: {
          name: 'nats',
          options: {
            servers: ['http://localhost:4444'],
          },
        },
        logger: new Logger(BrokerModule.name),
        outbox: {
          outbox,
          redis: 'redis://localhost:6380',
          cron: '*/2 * * * * *',
        },
        tracer,
      }),
      inject: [Tracer, OutboxService],
    }),
    SharedModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
