import { Injectable } from '@nestjs/common';
import { Broker, ExtractClient } from '@williele/broker';
import { InjectBroker } from '@williele/broker-nest';

export interface Demo {
  message: string;
}

export interface DemoListInput {
  name: string;
  length: number;
}

export interface DemoListOutput {
  list: Demo[];
}

class NestClient extends ExtractClient {
  constructor(broker: Broker) {
    super(broker, {
      serviceName: 'nest',
      serializer: 'arvo',
      transporter: 'nats',
      records: {
        Demo: {
          name: 'Demo',
          fields: { message: { order: 1, type: 'string' } },
        },
        DemoListInput: {
          name: 'DemoListInput',
          fields: {
            name: { order: 1, type: 'string' },
            length: { order: 2, type: 'int' },
          },
        },
        DemoListOutput: {
          name: 'DemoListOutput',
          fields: {
            list: {
              order: 1,
              type: 'array',
              items: { type: 'pointer', pointer: 'Demo' },
            },
          },
        },
      },
      methods: {
        hello: {
          request: 'DemoListInput',
          response: 'DemoListOutput',
        },
      },
      commands: {},
      signals: {},
    });
  }

  readonly methods = {
    hello: this.createMethod<DemoListInput, DemoListOutput>('hello'),
  };
}

@Injectable()
export class NestService extends NestClient {
  constructor(@InjectBroker() broker: Broker) {
    super(broker);
  }
}
