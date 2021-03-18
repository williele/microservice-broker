import { Injectable } from '@nestjs/common';
import { Context, Middleware } from '@wi/broker';
import { Demo } from '../demo.service';

@Injectable()
export class AuthMiddleware implements Middleware {
  constructor(private demo: Demo) {}

  handle(ctx: Context, next: CallableFunction) {
    next();
  }
}
