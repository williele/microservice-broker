import { Field, Method, Record, Service } from '@wi/broker';
import type { Context } from '@wi/broker';

@Record()
export class HelloInput {
  @Field({ type: 'string', order: 1 })
  name: string;
}

@Record()
export class Hello {
  @Field({ type: 'string', order: 1 })
  message: string;
}

@Service('app')
export class AppService {
  @Method({ request: HelloInput, response: Hello })
  hello(ctx: Context<HelloInput>): Hello {
    return { message: `hello ${ctx.body.name}` };
  }

  @Method({ request: HelloInput, response: Hello })
  getData(): Hello {
    return { message: 'Welcome to nest-demo!' };
  }
}
