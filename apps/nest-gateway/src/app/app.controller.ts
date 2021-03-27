import { Controller, Get, Query } from '@nestjs/common';
import { NestService } from './shared/nest.service';

function toNumber(val: string, def: number) {
  if (isNaN(Number(val))) return def;
  else return Number(val);
}

@Controller()
export class AppController {
  constructor(private readonly nestClient: NestService) {}

  @Get()
  hello(@Query('name') name: string, @Query('length') length: string) {
    return this.nestClient
      .main_hello({
        name: name || 'Someone',
        length: toNumber(length, 10),
      })
      .then((r) => r.list);
  }
}
