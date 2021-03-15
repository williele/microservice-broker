import { Serializer } from './schema/serializer';
import { NamedSchemaType } from './schema/interface';
import { BaseTransporter } from './transporter';

export interface SerializerConfig {
  /**
   * If false skip validate before encode
   */
  encodeValidate?: boolean;
  /**
   * If false skip validate after decode
   */
  decodeValidate?: boolean;
}

export interface BrokerSchema {
  transporter: string;
  types: Record<string, string>;
  methods: Record<string, { requestType: string; responseType: string }>;
}

export interface BrokerConfig {
  serviceName: string;
  serializer: Serializer;

  transporter: BaseTransporter;
}

export interface AddMethodConfig {
  name: string;
  requestType: NamedSchemaType | string;
  responseType: NamedSchemaType | string;
  handler: (...args) => Promise<unknown> | unknown;
}

export interface TransportPacket {
  header?: Record<string, string>;
  body: Buffer;
}
