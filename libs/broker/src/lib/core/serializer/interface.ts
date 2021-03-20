interface BaseConfig {
  /**
   * Encode trace span for encode and decode
   */
  tracing?: boolean;
}

export interface ArvoSerializerConfig extends BaseConfig {
  name: 'arvo';
}

export interface MsgPackSerializerConfig extends BaseConfig {
  name: 'msgpack';
}

export type SerializerConfig = ArvoSerializerConfig | MsgPackSerializerConfig;
