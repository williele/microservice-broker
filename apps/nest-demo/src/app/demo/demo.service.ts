import { Method, Service, UseMiddleware } from '@wi/broker';
import type { Context } from '@wi/broker';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { DemoInput, DemoOutput } from './model';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

@Service('demo')
@UseMiddleware(AuthMiddleware)
export class DemoService {
  @Method({ request: DemoInput, response: DemoOutput })
  async hello(ctx: Context<DemoInput>): Promise<DemoOutput> {
    const span = ctx.startSpan('say_hello');
    await delay(200);

    return Promise.resolve({ age: 10 }).finally(() => {
      span.finish();
    });
  }

  @Method({ request: DemoInput, response: DemoOutput })
  demo(): DemoOutput {
    return { age: 10 };
  }
}
