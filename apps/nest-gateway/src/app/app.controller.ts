import { Controller, Get, Query } from '@nestjs/common';
import { Broker } from '@williele/broker';
import { NestService } from './shared/nest.service';
import { OutboxService } from './shared/outbox.service';

function toNumber(val: string, def: number) {
  if (isNaN(Number(val))) return def;
  else return Number(val);
}

@Controller()
export class AppController {
  constructor(
    private readonly nestService: NestService,
    private readonly broker: Broker,
    private readonly outbox: OutboxService
  ) {}

  _demoCallback = this.nestService.demoCommandCallback((msg, error) => {
    if (error) {
      console.log('COMMAND ERROR:', error.message);
    }
    console.log('COMMAND CALLBACK:', msg.payload);
  });

  _demoSignal = this.nestService.DemoSignalHandle({
    async handler(ctx) {
      console.log('RECEIVE SIGNAL:', ctx.body.name);
    },
  });

  @Get()
  hello(@Query('name') name: string, @Query('length') length: string) {
    return this.nestService
      .helloMethod({
        name: name || 'Someone',
        length: toNumber(length, 10),
      })
      .then((r) => r.list);
  }

  @Get('demo')
  async demo(@Query('name') name: string) {
    const packet = await this.nestService.demoCommand({
      name: name || 'someone',
    });
    const msg = await this.outbox.add(packet);
    await this.broker.emitOutbox(msg);
  }
}
