import { TransporterConfig } from './transporter';
import { SerializerConfig } from './serializer';
import type { Tracer } from 'opentracing';
import { RecordDefinition } from './schema';
import { CommandMessage, Interceptor, Packet } from './client/interface';
import { Outbox } from './outbox';
import type { QueueOptions } from 'bull';

export type ID = string | number;

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

export interface ExtractClientMethod<I = unknown, O = unknown> {
  (input: I, header?: Packet['header']): Promise<O>;
}

export interface ExtractCommandMessage<I = unknown> {
  (input: I, header?: Packet['header']): Promise<CommandMessage>;
}
