import { Injectable } from '@nestjs/common';
import { Context, Middleware } from '@wi/broker';
import { Demo } from '../demo.service';

@Injectable()
export class AuthMiddleware extends Middleware {
  constructor(private demo: Demo) {
    super();
  }

  handle(ctx: Context, next: CallableFunction) {
    next();
  }
}
