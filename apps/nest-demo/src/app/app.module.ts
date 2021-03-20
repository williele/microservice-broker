import { Module } from '@nestjs/common';
import { BrokerModule } from '@williele/broker-nest';
import { initTracer } from 'jaeger-client';

import { DemoModule } from './demo/demo.module';

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
            info(msg) {
              console.log('INFO ', msg);
            },
            error(msg) {
              console.log('ERROR', msg);
            },
          },
        }
      ),
    }),
    DemoModule,
  ],
})
export class AppModule {}
