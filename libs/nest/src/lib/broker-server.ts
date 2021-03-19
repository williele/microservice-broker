import { Inject } from '@nestjs/common';
import { Server, CustomTransportStrategy } from '@nestjs/microservices';
import { Broker } from '@williele/broker';
import { BROKER_TOKEN } from './constant';

export class BrokerServer extends Server implements CustomTransportStrategy {
  constructor(
    @Inject(BROKER_TOKEN)
    private readonly broker: Broker
  ) {
    super();
  }

  async listen() {
    await this.broker.start();
  }

  close() {
    // this.broker
  }
}
