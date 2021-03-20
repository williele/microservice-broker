import { ConfigError } from '../error';
import { ArvoSerializer } from './arvo-serializer';
import { SerializerConfig } from './interface';
import { MsgPackSerializer } from './msgpack-serializer';

/**
 * Create serializer from config
 */
export function createSerializer(config: SerializerConfig) {
  if (config.name === 'arvo') {
    return new ArvoSerializer(config);
  } else if (config.name === 'msgpack') {
    return new MsgPackSerializer(config);
  } else {
    throw new ConfigError('Unknown serializer name');
  }
}
