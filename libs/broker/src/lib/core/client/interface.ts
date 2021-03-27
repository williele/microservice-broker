/**
 * Request and response packet
 */
export interface Packet<B = unknown> {
  body: B;
  header: Record<string, string>;
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
