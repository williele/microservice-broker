import { Logger, Module } from '@nestjs/common';
import { BrokerModule } from '@williele/broker-nest';
import { Tracer } from 'opentracing';

import { AppService } from './app.service';
import { Demo, DemoSignal } from './model';
import { OutboxService } from './shared/outbox.service';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    BrokerModule.forRootAsync({
      import: [SharedModule],
      factory: (tracer: Tracer, outbox: OutboxService) => ({
        serviceName: 'nest',
        serializer: { name: 'arvo' },
        transporter: {
          name: 'nats',
          options: {
            servers: ['http://localhost:4444'],
          },
        },
        logger: new Logger('Broker'),
        server: {
          records: [Demo],
          signals: [{ record: DemoSignal }],
          schemaFile: './apps/nest-service/service-schema.json',
        },
        outbox: {
          outbox,
          redis: 'redis://localhost:6380',
        },
        tracer,
      }),
      inject: [Tracer, OutboxService],
    }),
    SharedModule,
  ],
  providers: [AppService],
})
export class AppModule {}
