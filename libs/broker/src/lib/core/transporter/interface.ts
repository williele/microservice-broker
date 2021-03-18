import type { ClientOpts } from 'nats';

export interface NatsConfig {
  name: 'nats';
  options: ClientOpts;
}

export type TransporterConfig = NatsConfig;
