import { SerializerAdaptor } from '../core/schema/serializer';

/**
 * Default serializer use Arvo and fastest-validate
 */
export class DefaultSerializer extends SerializerAdaptor {
  encode<T>(name: string, val: T): Buffer {
    return Buffer.from('');
  }

  decode<T>(name: string, buffer: Buffer): T {
    return null;
  }
}
