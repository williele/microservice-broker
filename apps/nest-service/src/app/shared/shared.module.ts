import { Module, Provider } from '@nestjs/common';
import { Tracer } from 'opentracing';
import { initTracer } from 'jaeger-client';

const tracerProvider: Provider = {
  provide: Tracer,
  useValue: initTracer(
    {
      serviceName: 'test-service',
      sampler: { type: 'const', param: 1 },
      reporter: { logSpans: false },
    },
    {}
  ),
};

@Module({
  providers: [tracerProvider],
  exports: [Tracer],
})
export class SharedModule {}
