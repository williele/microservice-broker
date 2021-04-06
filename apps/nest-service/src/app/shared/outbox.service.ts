import { Injectable } from '@nestjs/common';
import { MessagePackage, MessagePacket, Outbox } from '@williele/broker';
import * as cuid from 'cuid';

@Injectable()
export class OutboxService extends Outbox {
  private outbox: Record<string, MessagePackage> = {};

  async add(message: MessagePacket) {
    const id = cuid();
    this.outbox[id] = { id, ...message };
    return this.outbox[id];
  }

  async remove(id: string) {
    delete this.outbox[id];
  }

  async list() {
    return Object.values(this.outbox);
  }
}
