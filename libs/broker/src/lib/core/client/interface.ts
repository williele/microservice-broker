import { BrokerError } from '../error';

/**
 * Request and response packet
 */
export interface Packet<B = unknown> {
  body: B;
  header: Record<string, string>;
}

export interface CommandHandler<T = unknown> {
  (message: T, error?: BrokerError): Promise<void> | void;
}

/**
 * Package of a command message
 * packet body is already encoded
 */
export interface CommandMessage {
  service: string;
  command: string;
  // Packet
  body: Buffer;
  header: Packet['header'];
}

export interface InterceptorNext {
  (): Promise<Packet>;
}

export interface Interceptor {
  (packet: Packet, next: InterceptorNext): Promise<Packet>;
}

export interface InterceptorCompose {
  (packet: Packet, next?: InterceptorNext): Promise<Packet>;
}
