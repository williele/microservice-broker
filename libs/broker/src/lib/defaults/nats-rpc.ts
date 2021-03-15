import { ClientOpts, Client, connect, NatsError } from 'nats';
import { MethodRequest, MethodResponse } from '../core';
import { RPCTransporter } from '../core/rpc';

export class NatsRPCTransporter extends RPCTransporter {
  private client: Client;

  constructor(private clientOpts: ClientOpts) {
    super();
  }

  connect(): Promise<void> {
    if (this.client) return;

    this.client = connect({
      ...this.clientOpts,
      encoding: 'binary',
      preserveBuffers: true,
      maxReconnectAttempts: -1,
    });

    this.client.on('connect', () => this.onConnect());
    this.client.on('error', (...args) => this.onError(...args));
    this.client.on('disconnect', () => this.onDiconnect());
    this.client.on('reconnect', () => this.onReconnect());

    return new Promise((res, rej) => {
      const connectCb = () => {
        res();
        completed();
      };

      const errorCb = (...args) => {
        rej(...args);
        completed();
      };

      const completed = () => {
        this.client.removeListener('connect', connectCb);
        this.client.removeListener('error', errorCb);
      };

      this.client.once('connect', connectCb);
      this.client.once('error', errorCb);
    });
  }

  listen(
    subject: string,
    callback: (req: MethodRequest, reply: string) => void
  ) {
    if (!this.isConnected) throw new Error(`Cannot listen before connect`);

    this.client.subscribe(subject, (message, reply: string) => {
      callback(JSON.parse(message), reply);
    });
  }

  sendRequest(
    subject: string,
    message: MethodRequest
  ): Promise<MethodResponse> {
    if (!this.isConnected)
      throw new Error(`Cannot send request before connect`);

    const buffer = Buffer.from(JSON.stringify(message));
    return new Promise((res, rej) => {
      this.client.requestOne(subject, buffer, 5_000, (response) => {
        if (response instanceof NatsError) {
          rej(response);
        } else {
          const result = JSON.parse(response) as MethodResponse;
          res({
            service: result.service,
            method: result.method,
            header: result.header,
            body: Buffer.from(result.body),
          });
        }
      });
    });
  }

  sendResponse<T>(subject: string, message: MethodResponse): Promise<T> {
    return new Promise<T>((res) => {
      this.client.publish(subject, Buffer.from(JSON.stringify(message)), () =>
        res(undefined)
      );
    });
  }
}
