import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Interceptor } from '@williele/broker';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class RequestInterceptor {
  constructor(@Inject(REQUEST) private request: Request) {}

  interceptor: Interceptor = async (packet, next) => {
    packet.header['user-agent'] = this.request.get('User-Agent');
    return next();
  };
}
