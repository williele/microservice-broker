import { Method, Service, UseMiddleware } from '@williele/broker-nest';
import type { Context } from '@williele/broker';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { DemoInput, DemoOutput } from './model';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

@Service('demo')
@UseMiddleware(AuthMiddleware)
export class DemoService {
  @Method({
    request: DemoInput,
    response: DemoOutput,
    description: 'say hello to demo service',
    tracing: true,
  })
  async hello(ctx: Context<DemoInput>): Promise<DemoOutput> {
    const span = ctx.startSpan('say_hello');
    await delay(20);

    return Promise.resolve({ age: 10 }).finally(() => {
      span.finish();
    });
  }

  @Method({ request: DemoInput, response: DemoOutput, tracing: true })
  demo(): DemoOutput {
    // throw new ValidateError('failed_to_validate');
    // throw ValidateError.fields(
    //   { field: 'username', constrain: 'unique' },
    //   { field: 'password', constrain: 'min:10' }
    // );

    return { age: 10 };
  }
}
