import { Controller, Get, Query } from '@nestjs/common';
import { NestClient } from './shared/nest.client';

function toNumber(val: string, def: number) {
  if (isNaN(Number(val))) return def;
  else return Number(val);
}

@Controller()
export class AppController {
  constructor(private readonly nestClient: NestClient) {}

  @Get()
  getData() {
    return this.nestClient.main_getData(null);
  }

  @Get('hello')
  hello(@Query('name') name: string) {
    return this.nestClient.main_hello({ name: name || 'Anomous' });
  }

  @Get('list-hello')
  listHello(@Query('name') name: string, @Query('length') length: string) {
    // return this.nestClient.hello({ name: name || 'Anomous' });
    return this.nestClient
      .main_moreHello({
        name: name || 'Someone',
        length: toNumber(length, 10),
      })
      .then((r) => r.list);
  }
}
