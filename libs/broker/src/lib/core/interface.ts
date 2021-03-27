import { TransporterConfig } from './transporter';
import { SerializerConfig } from './serializer';
import type { Tracer, Span } from 'opentracing';
import { RecordDefinition } from './schema';
export interface BrokerConfig {
  serviceName: string;
  serializer: SerializerConfig;
  transporter: TransporterConfig;
  tracer?: Tracer;
  server?: {
    /**
     * Initial record models
     */
    records?: RecordDefinition[];
    /**
     * If true, all method is enable tracing by default
     */
    tracing?: boolean;
  };
  /**
   * If true, broker won't create server
   */
  disableServer?: boolean;
}

export interface TransportPacket {
  header: Record<string, string>;
  body: Buffer;
}

export interface ExtractClientMethod<I = unknown, O = unknown> {
  (input: I, span?: Span): Promise<O>;
}
