import { Injectable } from '@nestjs/common';
import { Broker, ExtractClient } from '@williele/broker';

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
    super(broker, 'nest');
  }

  /**
   * @method
   */
  readonly helloMethod = this.createMethod<DemoListInput, DemoListOutput>(
    'hello'
  );

  /**
   * @command
   */
  readonly demoCommand = this.createCommandMessage<DemoCommand>('demo');

  /**
   * @commandCallback
   */
  readonly demoCommandCallback = this.createCommandCallback<DemoCommand>(
    'demo'
  );
}

@Injectable()
export class NestService extends NestClient {
  constructor(broker: Broker) {
    super(broker);
  }
}
