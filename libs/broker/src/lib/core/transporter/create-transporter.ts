import { ConfigError } from '../error';
import { BrokerConfig } from '../interface';
import { NatsTransporter } from './nats-transporter';

/**
 * Create transporter from config
 */
export function createTransporter(config: BrokerConfig) {
  if (config.transporter.name === 'nats') {
    return new NatsTransporter(config, config.transporter.options);
  } else {
    throw new ConfigError('Unknown transporter name');
  }
}
