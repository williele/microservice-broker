import { Module, Provider } from '@nestjs/common';
import { Tracer } from 'opentracing';
import { NestService } from './nest.service';
import { OutboxService } from './outbox.service';

const tracerProvider: Provider = {
  provide: Tracer,
  useValue: new Tracer(),
  // useValue: initTracer(
  //   {
  //     serviceName: 'nest-gateway',
  //     sampler: { type: 'const', param: 1 },
  //     reporter: { logSpans: false },
  //   },
  //   {}
  // ),
};

@Module({
  providers: [tracerProvider, NestService, OutboxService],
  exports: [Tracer, NestService, OutboxService],
})
export class SharedModule {}
