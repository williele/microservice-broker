import { ExtractClient, Broker } from '@williele/broker'
import { InjectBroker } from '@williele/broker-nest'
import { Injectable } from '@nestjs/common'

export interface DemoInput {
  name: string;
}

export interface DemoOutput {
  message: string;
}

export interface DemoListInput {
  name: string;
  length: number;
}

export interface DemoListOutput {
  list: DemoOutput[];
}

/**
 * Extract client for auth service
 */
@Injectable()
export class NestClient extends ExtractClient {
  /**
   * @method
   */
  public main_getData = this.createMethod<null, null>('main.getData');

  /**
   * @method
   */
  public main_hello = this.createMethod<DemoInput, DemoOutput>('main.hello');

  /**
   * @method
   */
  public main_moreHello = this.createMethod<DemoListInput, DemoListOutput>('main.moreHello');

  constructor(@InjectBroker() broker: Broker) {
    super(broker, 'nest');
  }
}