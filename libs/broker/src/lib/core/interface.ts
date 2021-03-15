import { NamedSchemaType } from './schema/interface';
import { BaseTransporter } from './transporter';
import { BaseSerializer } from './serializer';

export interface BrokerSchema {
  transporter: string;
  serializer: string;
  types: Record<string, string>;
  methods: Record<string, { requestType: string; responseType: string }>;
}

export interface BrokerConfig {
  serviceName: string;
  serializer: { new (): BaseSerializer };
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
