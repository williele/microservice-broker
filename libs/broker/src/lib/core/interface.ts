import { Serializer } from './schema/serializer';
import { RPCTransporter } from './rpc';
import { NamedSchemaType, SchemaType } from './schema/interface';

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

export interface MethodRequest {
  method: string;
  header?: Record<string, string>;
  body: Buffer;
}

export interface MethodResponse {
  service: string;
  method: string;
  header?: Record<string, string>;
  body: Buffer;
}

export interface BrokerSchema {
  types: Record<string, string>;
  methods: Record<string, { requestType: string; responseType: string }>;
}

export interface BrokerConfig {
  serviceName: string;
  serializer: Serializer;

  rpcTransporter?: RPCTransporter;
}

export interface AddMethodConfig {
  name: string;
  requestType: NamedSchemaType | string;
  responseType: NamedSchemaType | string;
  handler: (...args) => Promise<unknown> | unknown;
}
