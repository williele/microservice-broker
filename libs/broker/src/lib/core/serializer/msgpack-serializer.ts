import { packageLoader } from '../utils/package-loader';
import { BaseSerializer } from './serializer';
import { MessagePack } from 'msgpack5';

let msgpack5: typeof import('msgpack5') = undefined;

/**
 * MsgPackSerializer dependencies
 * - msgpack5
 */
export class MsgPackSerializer extends BaseSerializer {
  serializerName = 'msgpack';

  private msgpack: MessagePack;

  constructor() {
    super();

    msgpack5 = packageLoader('msgpack5', 'MsgPackSerializer', () =>
      require('msgpack5')
    );

    this.msgpack = msgpack5();
  }

  encode<T>(name: string, val: T): Buffer {
    this.getRecord(name);
    return Buffer.from(this.msgpack.encode(val));
  }

  decode<T>(name: string, buffer: Buffer): T {
    this.getRecord(name);
    return this.msgpack.decode(buffer) as T;
  }
}
