import * as msgpack5 from 'msgpack5';
import { BaseSerializer } from '../core';

/**
 * MsgPackSerializer dependencies
 * - msgpack5
 */
export class MsgPackSerializer extends BaseSerializer {
  serializerName = 'msgpack';

  private msgpack = msgpack5();
  private encoder = this.msgpack.encode;
  private decoder = this.msgpack.decode;

  encode<T>(name: string, val: T): Buffer {
    this.getRecord(name);
    return Buffer.from(this.encoder(val));
  }

  decode<T>(name: string, buffer: Buffer): T {
    this.getRecord(name);
    return this.decoder(buffer) as T;
  }
}
