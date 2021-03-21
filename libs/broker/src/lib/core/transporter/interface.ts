import type { ConnectionOptions } from 'nats';

export interface NatsConfig {
  name: 'nats';
  options: ConnectionOptions;
}

export type TransporterConfig = NatsConfig;
