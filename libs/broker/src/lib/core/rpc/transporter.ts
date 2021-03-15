import { EventEmitter } from 'events';
import {
  CONNECT_EVENT,
  DISCONNECT_EVENT,
  ERROR_EVENT,
  RECONNECT_EVENT,
} from '../constant';
import { MethodRequest, MethodResponse } from '../interface';

export abstract class RPCTransporter extends EventEmitter {
  private _isConnected = false;
  get isConnected() {
    return this._isConnected;
  }

  abstract connect(): Promise<void>;
  abstract listen(
    subject: string,
    callback: (message: MethodRequest, reply: string) => void
  );

  abstract sendRequest(
    subject: string,
    payload: MethodRequest
  ): Promise<MethodResponse>;
  abstract sendResponse(
    subject: string,
    payload: MethodResponse
  ): Promise<void>;

  // Status emit
  protected onConnect() {
    this._isConnected = true;
    this.emit(CONNECT_EVENT);
  }

  protected onDiconnect() {
    this._isConnected = false;
    this.emit(DISCONNECT_EVENT);
  }

  protected onReconnect() {
    this._isConnected = true;
    this.emit(RECONNECT_EVENT);
  }

  protected onError(...args) {
    this.emit(ERROR_EVENT, ...args);
  }
}
