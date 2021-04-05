import { ID } from '@williele/broker';
import { MessagePackage } from './interface';

export abstract class Outbox {
  /**
   * Remove a command message by id
   * @param id
   */
  abstract remove(id: ID): Promise<void>;

  /**
   * Get list of command message id need to send
   */
  abstract list(): Promise<MessagePackage[]>;
}
