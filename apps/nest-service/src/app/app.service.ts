import { NullRecord } from '@williele/broker';
import type { Context } from '@williele/broker';
import { Method, Service } from '@williele/broker-nest';
import { DemoInput, DemoListInput, DemoListOutput, DemoOutput } from './model';

@Service('main')
export class AppService {
  sayHello(name: string): DemoOutput {
    return { message: `hello ${name}!` };
  }

  @Method({
    request: NullRecord.name,
    response: NullRecord.name,
    tracing: true,
  })
  getData() {
    return null;
  }

  @Method({
    request: DemoInput,
    response: DemoOutput,
    tracing: true,
  })
  hello(ctx: Context<DemoInput>): DemoOutput {
    // return { message: `hello ${ctx.body.name}` };
    return this.sayHello(ctx.body.name);
  }

  @Method({
    request: DemoListInput,
    response: DemoListOutput,
    tracing: true,
  })
  moreHello(ctx: Context<DemoListInput>): DemoListOutput {
    const input = ctx.body;

    return {
      list: new Array(input.length).fill(0).map((_, i) => ({
        message: `${i}) Hello ${input.name}`,
      })),
    };
  }
}
