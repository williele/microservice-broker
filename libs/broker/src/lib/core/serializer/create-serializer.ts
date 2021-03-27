import { ConfigError } from '../error';
import { RecordStorage } from '../schema';
import { ArvoSerializer } from './arvo-serializer';
import { SerializerConfig } from './interface';
import { MsgPackSerializer } from './msgpack-serializer';

/**
 * Create serializer from config
 */
export function createSerializer(
  config: SerializerConfig,
  storage: RecordStorage
) {
  if (config.name === 'arvo') {
    return new ArvoSerializer(config, storage);
  } else if (config.name === 'msgpack') {
    return new MsgPackSerializer(config, storage);
  } else {
    throw new ConfigError('Unknown serializer name');
  }
}
