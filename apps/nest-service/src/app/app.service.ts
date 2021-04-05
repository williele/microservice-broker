import { Injectable } from '@nestjs/common';
import type { Context } from '@williele/broker';
import {
  Method,
  Middleware,
  Service,
  UseMiddleware,
} from '@williele/broker-nest';
import { DemoListInput, DemoListOutput } from './model';

@Injectable()
class DemoMiddleware implements Middleware {
  async handle(_ctx, next) {
    console.log('middlware');
    await next();
  }
}

@Service()
@UseMiddleware(DemoMiddleware)
export class AppService {
  @Method({
    request: DemoListInput,
    response: DemoListOutput,
  })
  hello(ctx: Context<DemoListInput>): DemoListOutput {
    const input = ctx.body;

    return {
      list: new Array(input.length).fill(0).map((_, i) => ({
        message: `${i}) Hello ${input.name}`,
      })),
    };
  }
}
