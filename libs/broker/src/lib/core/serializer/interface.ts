export interface ArvoSerializerConfig {
  name: 'arvo';
}

export interface MsgPackSerializerConfig {
  name: 'msgpack';
}

export type SerializerConfig = ArvoSerializerConfig | MsgPackSerializerConfig;
