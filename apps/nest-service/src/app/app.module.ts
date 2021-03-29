import { Logger, Module } from '@nestjs/common';
import { BrokerModule } from '@williele/broker-nest';
import { Tracer } from 'opentracing';

import { AppService } from './app.service';
import { Demo } from './model';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    BrokerModule.forRootAsync({
      import: [SharedModule],
      factory: (tracer: Tracer) => ({
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
          schemaFile: './apps/nest-service/service-schema.json',
        },
        tracer,
      }),
      inject: [Tracer],
    }),
    SharedModule,
  ],
  providers: [AppService],
})
export class AppModule {}
