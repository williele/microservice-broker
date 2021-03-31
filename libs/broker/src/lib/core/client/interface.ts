/**
 * Request and response packet
 */
export interface Packet<B = unknown> {
  body: B;
  header: Record<string, string>;
}

/**
 * Package of a command message
 * packet body is already encoded
 */
export interface CommandMessage {
  service: string;
  command: string;
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
