import { ID } from '@williele/broker';
import { MessagePacket } from '../interface';

export abstract class Outbox {
  /**
   * Get a command message by id
   * @param id
   */
  abstract get(id: ID): Promise<MessagePacket>;
  /**
   * Remove a command message by id
   * @param id
   */
  abstract remove(id: ID): Promise<void>;
  /**
   * Set a command message error
   * @param id
   * @param message
   */
  abstract setError(id: ID, message: string): Promise<void>;

  /**
   * Get list of command message id need to send
   */
  abstract list(): Promise<ID[]>;
}
