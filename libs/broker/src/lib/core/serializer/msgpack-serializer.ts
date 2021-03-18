import { packageLoader } from '../utils/package-loader';
import { BaseSerializer } from './serializer';

let msgpack5: typeof import('msgpack5') = undefined;

/**
 * MsgPackSerializer dependencies
 * - msgpack5
 */
export class MsgPackSerializer extends BaseSerializer {
  serializerName = 'msgpack';

  private msgpack = msgpack5();
  private encoder = this.msgpack.encode;
  private decoder = this.msgpack.decode;

  constructor() {
    super();

    msgpack5 = packageLoader('msgpack5', 'MsgPackSerializer', () =>
      require('msgpack5')
    );
  }

  encode<T>(name: string, val: T): Buffer {
    this.getRecord(name);
    return Buffer.from(this.encoder(val));
  }

  decode<T>(name: string, buffer: Buffer): T {
    this.getRecord(name);
    return this.decoder(buffer) as T;
  }
}
