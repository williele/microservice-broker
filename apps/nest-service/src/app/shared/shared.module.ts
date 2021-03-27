import { Module, Provider } from '@nestjs/common';
import { Tracer } from 'opentracing';

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
  providers: [tracerProvider],
  exports: [Tracer],
})
export class SharedModule {}
