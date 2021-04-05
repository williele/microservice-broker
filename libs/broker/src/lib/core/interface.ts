import { TransporterConfig } from './transporter';
import { SerializerConfig } from './serializer';
import type { Tracer } from 'opentracing';
import { RecordDefinition } from './schema';
import { Interceptor } from './client/interface';
import { Outbox } from './outbox';
import type { QueueOptions } from 'bull';
import { BrokerError } from './error';

export type ID = string | number;

export interface SignalDefinition {
  record: RecordDefinition;
  description?: string;
  deprecated?: boolean;
}

export interface BrokerConfig {
  serviceName: string;
  serializer: SerializerConfig;
  transporter: TransporterConfig;
  tracer?: Tracer;
  logger?: {
    log: (message: string) => void;
    error: (message: string) => void;
  };
  server?: {
    /**
     * Initial record models
     */
    records?: RecordDefinition[];
    /**
     * List of signal this broker may generate
     */
    signals?: SignalDefinition[];
    /**
     * If true, all method is enable tracing by default
     */
    tracing?: boolean;
    /**
     * Given a path, server will write a schema file
     * Make introspect development services easier
     */
    schemaFile?: string;
  };
  client?: {
    interceptors?: Interceptor[];
  };
  /**
   * Outbox of command message and event message
   */
  outbox?: {
    redis: QueueOptions['redis'];
    outbox: Outbox;
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

export interface MessagePacket {
  destination: string;
  request: string;
  header: Record<string, string>;
  payload: Buffer;
}

export interface CallbackMessage<P = unknown> {
  destination: string;
  request: string;
  header: Record<string, string>;
  payload: P;
}

export interface MessageCallback<P = unknown> {
  (message: CallbackMessage<P>, error?: BrokerError): Promise<void> | void;
}
