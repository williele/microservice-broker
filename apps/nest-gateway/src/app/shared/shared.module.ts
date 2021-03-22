import { Module, Provider } from '@nestjs/common';
import { Tracer } from 'opentracing';
import { NestClient } from './nest.client';

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
  providers: [tracerProvider, NestClient],
  exports: [Tracer, NestClient],
})
export class SharedModule {}
