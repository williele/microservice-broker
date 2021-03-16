import { EventEmitter } from 'events';
import {
  CONNECT_EVENT,
  DISCONNECT_EVENT,
  ERROR_EVENT,
  RECONNECT_EVENT,
} from './constant';
import { TransportPacket } from './interface';

export abstract class BaseTransporter extends EventEmitter {
  abstract readonly transporterName: string;

  private _connect = false;
  get isConnect() {
    return this._connect;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void> | void;

  abstract subscribe(
    subject: string,
    callback: (packet: TransportPacket, reply: string) => void
  );

  abstract sendRequest(
    subject: string,
    packet: TransportPacket
  ): Promise<TransportPacket>;
  abstract send(subject: string, packet: TransportPacket): Promise<void>;

  // Status event
  protected onConnect() {
    this._connect = true;
    this.emit(CONNECT_EVENT);
  }

  protected onDisconnect() {
    this._connect = false;
    this.emit(DISCONNECT_EVENT);
  }

  protected onReconnect() {
    this._connect = true;
    this.emit(RECONNECT_EVENT);
  }

  protected onError(error) {
    this.emit(ERROR_EVENT, error);
  }
}
