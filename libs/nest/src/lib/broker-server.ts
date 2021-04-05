import { Injectable } from '@nestjs/common';
import { Server, CustomTransportStrategy } from '@nestjs/microservices';
import { Broker } from '@williele/broker';

@Injectable()
export class BrokerServer extends Server implements CustomTransportStrategy {
  constructor(private readonly broker: Broker) {
    super();
  }

  async listen() {
    await this.broker.start();
  }

  async close() {
    await this.broker.destroy();
  }
}
