import { Module } from '@nestjs/common';
import { BrokerModule } from '@wi/broker';
import { initTracer } from 'jaeger-client';

import { AppService } from './app.service';
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
          reporter: { logSpans: true },
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
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
