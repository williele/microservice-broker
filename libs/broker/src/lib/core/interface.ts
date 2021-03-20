import { NamedRecordType, NamedSchemaType } from './schema/interface';
import { TransporterConfig } from './transporter';
import { SerializerConfig } from './serializer';
import type { Tracer } from 'opentracing';

export interface BrokerSchema {
  transporter: string;
  serializer: string;
  types: Record<string, NamedSchemaType>;
  methods: Record<string, MethodInfo>;
}

export interface BrokerConfig {
  serviceName: string;
  serializer: SerializerConfig;
  transporter: TransporterConfig;
  tracer?: Tracer;
}

export interface MethodInfo {
  request: string;
  response: string;
}

export type UsableRecord = NamedRecordType | string | { new (...args) };

export interface TransportPacket {
  header: Record<string, string>;
  body: Buffer;
}
