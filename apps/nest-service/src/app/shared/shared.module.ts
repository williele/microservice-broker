import { Module, Provider } from '@nestjs/common';
import { Tracer } from 'opentracing';
import { OutboxService } from './outbox.service';

const tracerProvider: Provider = {
  provide: Tracer,
  useValue: new Tracer(),
  // useValue: initTracer(
  //   {
  //     serviceName: 'nest-service',
  //     sampler: { type: 'const', param: 1 },
  //     reporter: { logSpans: false },
  //   },
  //   {}
  // ),
};

@Module({
  providers: [tracerProvider, OutboxService],
  exports: [Tracer, OutboxService],
})
export class SharedModule {}
