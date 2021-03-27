import { NestClient } from '.broker/gateway';
import { Injectable } from '@nestjs/common';
import { Broker } from '@williele/broker';
import { InjectBroker } from '@williele/broker-nest';

@Injectable()
export class NestService extends NestClient {
  constructor(@InjectBroker() broker: Broker) {
    super(broker);
  }
}
