import { Injectable } from '@nestjs/common';
import type { Context } from '@williele/broker';
import { Middleware } from '@williele/broker-nest';

@Injectable()
export class AuthMiddleware implements Middleware {
  async handle(ctx: Context, next: CallableFunction) {
    console.log('auth middleware');

    next();
  }
}
