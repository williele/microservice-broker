import { Injectable } from '@nestjs/common';
import type { Context } from '@williele/broker';
import { Middleware } from '@williele/broker-nest';
import { Demo } from '../demo.service';

@Injectable()
export class AuthMiddleware implements Middleware {
  constructor(private demo: Demo) {}

  async handle(ctx: Context, next: CallableFunction) {
    console.log('auth middleware');

    next();
  }
}
