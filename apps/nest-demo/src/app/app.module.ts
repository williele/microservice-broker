import { Logger, Module } from '@nestjs/common';
import { BrokerModule } from '@williele/broker-nest';
import { initTracer } from 'jaeger-client';

import { DemoModule } from './demo/demo.module';

const logger = new Logger('Tracer');

@Module({
  imports: [
    BrokerModule.forRoot({
      serviceName: 'test',
      serializer: { name: 'arvo' },
      transporter: { name: 'nats', options: {} },
      tracer: initTracer(
        {
          serviceName: 'test-service',
          sampler: { type: 'const', param: 1 },
          reporter: { logSpans: false },
        },
        {
          logger: {
            info: (msg) => logger.log(msg),
            error: (msg) => logger.error(msg),
          },
        }
      ),
    }),
    DemoModule,
  ],
})
export class AppModule {}
