import { Module } from '@nestjs/common';
import { BrokerModule } from '@williele/broker-nest';
import { Tracer } from 'opentracing';

import { AppController } from './app.controller';
import { RequestInterceptor } from './shared/request.interceptor';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    SharedModule,
    BrokerModule.forRootAsync({
      import: [SharedModule],
      factory: (tracer: Tracer, request: RequestInterceptor) => ({
        serviceName: 'gateway',
        serializer: { name: 'arvo' },
        transporter: {
          name: 'nats',
          options: {
            servers: ['http://localhost:4444'],
          },
        },
        client: {
          interceptors: [request.interceptor],
        },
        tracer,
      }),
      inject: [Tracer, RequestInterceptor],
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
