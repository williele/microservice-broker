import { MessagePacket, MessageCallback } from '@williele/broker';

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

// ExtractClient interface
export interface ExtractClientMethod<I = unknown, O = unknown> {
  (input: I, header?: Packet['header']): Promise<O>;
}

export interface ExtractCommandMessage<I = unknown> {
  (input: I, header?: Packet['header']): Promise<MessagePacket>;
}

export interface ExtractCommandCallback<I = unknown> {
  (handler: MessageCallback<I>): Promise<void> | void;
}
