import { Module, Provider } from '@nestjs/common';
import { Tracer } from 'opentracing';
import { NestService } from './nest.service';
import { RequestInterceptor } from './request.interceptor';

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
  providers: [tracerProvider, RequestInterceptor, NestService],
  exports: [Tracer, RequestInterceptor, NestService],
})
export class SharedModule {}
