import { Injectable } from '@nestjs/common';
import { BadRequestError, Broker, ForbiddenError } from '@williele/broker';
import type { Context } from '@williele/broker';
import {
  Command,
  Method,
  Middleware,
  Service,
  UseMiddleware,
} from '@williele/broker-nest';
import {
  DemoCommand,
  DemoListInput,
  DemoListOutput,
  DemoSignal,
} from './model';
import { OutboxService } from './shared/outbox.service';

@Injectable()
class DemoMiddleware implements Middleware {
  async handle(_ctx, next) {
    console.log('middlware');
    await next();
  }
}

@Service()
@UseMiddleware(DemoMiddleware)
export class AppService {
  constructor(
    private readonly broker: Broker,
    private readonly outbox: OutboxService
  ) {}

  _demoSignalCallback = this.broker.onSignal<DemoSignal>(
    DemoSignal.name,
    (msg, error) => {
      console.log(msg);

      console.log(`Signal to ${msg.destination} callback`);
      if (error) {
        console.log('Error', error.message);
      }
      console.log('SIGNAL CALLBACK:', msg.payload);
    }
  );

  @Method({
    request: DemoListInput,
    response: DemoListOutput,
  })
  hello(ctx: Context<DemoListInput>): DemoListOutput {
    const input = ctx.body;

    return {
      list: new Array(input.length).fill(0).map((_, i) => ({
        message: `${i}) Hello ${input.name}`,
      })),
    };
  }

  @Command({
    request: DemoCommand,
  })
  async demo(ctx: Context<DemoCommand>) {
    const name = ctx.body.name;
    console.log(ctx.headers());

    const service = ctx.header('service');

    if (!service) throw new BadRequestError(`Missing service header`);
    if (name === 'joker') throw new ForbiddenError(`I'm Batman`);

    const signal = this.broker.createSignal<DemoSignal>(
      ctx.header('service'),
      DemoSignal.name,
      { name }
    );
    const outbox = await this.outbox.add(signal);

    await this.broker.emitOutbox(outbox);
    console.log('SIGNAL OUTBOX:', outbox);
    console.log('RECEIVE COMMAND:', name);
  }
}
