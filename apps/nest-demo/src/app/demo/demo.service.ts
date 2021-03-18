import { Method, Service, UseMiddleware } from '@wi/broker';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { DemoInput, DemoOutput } from './model';

@Service('demo')
@UseMiddleware(AuthMiddleware)
export class DemoService {
  @Method({ request: DemoInput, response: DemoOutput })
  hello(): DemoOutput {
    return { age: 21 };
  }

  @Method({ request: DemoInput, response: DemoOutput })
  demo(): DemoOutput {
    return { age: 10 };
  }
}
