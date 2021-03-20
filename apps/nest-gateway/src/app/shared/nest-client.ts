import { Injectable } from '@nestjs/common';
import { Broker, ExtractClient } from '@williele/broker';
import { InjectBroker } from '@williele/broker-nest';

@Injectable()
export class NestClient extends ExtractClient {
  constructor(@InjectBroker() broker: Broker) {
    super(broker, 'nest');
  }

  readonly getData = this.createMethod<null, null>('main.getData');
  readonly hello = this.createMethod<{ name: string }, { message: string }>(
    'main.hello'
  );

  readonly moreHello = this.createMethod<
    { name: string; length: number },
    { list: { message: string }[] }
  >('main.moreHello');
}
