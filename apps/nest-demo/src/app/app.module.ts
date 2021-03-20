import { Module } from '@nestjs/common';
import { BrokerModule } from '@williele/broker-nest';
import { initTracer } from 'jaeger-client';
import { Tracer } from 'opentracing';

import { DemoModule } from './demo/demo.module';

@Module({
  providers: [
    {
      provide: Tracer,
      useValue: initTracer(
        {
          serviceName: 'test-service',
          sampler: { type: 'const', param: 1 },
          reporter: { logSpans: false },
        },
        {}
      ),
    },
  ],
  exports: [Tracer],
})
class TracerModule {}

@Module({
  imports: [
    TracerModule,
    BrokerModule.forRootAsync({
      import: [TracerModule],
      factory: (tracer: Tracer) => ({
        serviceName: 'test',
        serializer: { name: 'arvo' },
        transporter: { name: 'nats', options: {} },
        tracer,
      }),
      inject: [Tracer],
    }),
    DemoModule,
  ],
})
export class AppModule {}
