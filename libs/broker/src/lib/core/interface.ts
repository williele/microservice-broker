import { NamedRecordType } from './schema/interface';
import { TransporterConfig } from './transporter';
import { SerializerConfig } from './serializer';
import type { Tracer, Span } from 'opentracing';
export interface BrokerConfig {
  serviceName: string;
  serializer: SerializerConfig;
  transporter: TransporterConfig;
  tracer?: Tracer;
  /**
   * If true, broker won't create server
   */
  disableServer?: boolean;
}

export type UsableRecord = NamedRecordType | string | { new (...args) };

export interface TransportPacket {
  header: Record<string, string>;
  body: Buffer;
}

export interface ExtractClientMethod<I = unknown, O = unknown> {
  (input: I, span?: Span): Promise<O>;
}
