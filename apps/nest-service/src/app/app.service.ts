import type { Context } from '@williele/broker';
import { Method, Service } from '@williele/broker-nest';
import { DemoListInput, DemoListOutput } from './model';

@Service('main')
export class AppService {
  @Method({
    request: DemoListInput,
    response: DemoListOutput,
    tracing: true,
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
