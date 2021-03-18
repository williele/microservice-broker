import { TransporterConfig } from './interface';
import { NatsTransporter } from './nats-transporter';

/**
 * Create transporter from config
 */
export function createTransporter(config: TransporterConfig) {
  if (config.name === 'nats') {
    return new NatsTransporter(config.options);
  } else {
    return undefined;
  }
}
