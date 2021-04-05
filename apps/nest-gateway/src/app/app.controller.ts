import { Controller, Get, Query } from '@nestjs/common';
import { Broker } from '@williele/broker';
import { InjectBroker } from '@williele/broker-nest';
import { NestService } from './shared/nest.service';

function toNumber(val: string, def: number) {
  if (isNaN(Number(val))) return def;
  else return Number(val);
}

@Controller()
export class AppController {
  constructor(
    private readonly nestService: NestService,
    @InjectBroker() private readonly broker: Broker
  ) {}

  @Get()
  hello(@Query('name') name: string, @Query('length') length: string) {
    return this.nestService.methods
      .hello({
        name: name || 'Someone',
        length: toNumber(length, 10),
      })
      .then((r) => r.list);
  }

  @Get('demo')
  async demo(@Query('name') name: string) {
    const packet = await this.nestService.commands.demo({
      name: name || 'someone',
    });

    console.log(packet);
    await this.broker.emit(packet);
  }
}
