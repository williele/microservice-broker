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

export interface DemoCommand {
  name: string;
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
        DemoCommand: {
          name: 'DemoCommand',
          fields: {
            name: { order: 1, type: 'string' },
          },
        },
      },
      methods: {
        hello: {
          request: 'DemoListInput',
          response: 'DemoListOutput',
        },
      },
      commands: {
        demo: {
          request: 'DemoCommand',
        },
      },
      signals: {},
    });
  }

  readonly methods = {
    hello: this.createMethod<DemoListInput, DemoListOutput>('hello'),
  };

  readonly commands = {
    demo: this.createCommandMessage<DemoCommand>('demo'),
  };
}

@Injectable()
export class NestService extends NestClient {
  constructor(@InjectBroker() broker: Broker) {
    super(broker);
  }
}
