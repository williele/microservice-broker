import { BaseTransporter } from './transporter';
import { TransportPacket } from '../interface';
import type { ClientOpts, Client } from 'nats';
import type { MessagePack } from 'msgpack5';
import { packageLoader } from '../utils/package-loader';

let nats: typeof import('nats') = undefined;
let msgpack5: typeof import('msgpack5') = undefined;

/**
 * Nats transporter dependencies
 * - msgpack5 (fore encode/decode)
 * - nats
 */
export class NatsTransporter extends BaseTransporter {
  transporterName = 'nats';

  private client: Client;
  private msgpack: MessagePack;

  constructor(private clientOps: ClientOpts) {
    super();

    nats = packageLoader('nats', 'NatsTransporter', () => require('nats'));
    msgpack5 = packageLoader('msgpack5', 'NatsTransporter', () =>
      require('msgpack5')
    );

    this.msgpack = msgpack5();
  }

  async connect() {
    if (this.client) return;

    this.client = nats.connect({
      ...this.clientOps,
      encoding: 'binary',
      preserveBuffers: true,
    });

    this.client.on('connect', () => this.onConnect());
    this.client.on('error', (error) => this.onError(error));
    this.client.on('disconnect', () => this.onDisconnect());
    this.client.on('reconnect', () => this.onReconnect());

    return new Promise<void>((resolve, reject) => {
      const connectCb = () => {
        resolve();
        completed();
      };

      const errorCb = (...args) => {
        reject(...args);
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

  async disconnect() {
    if (!this.client) return;

    this.client.close();
    this.client = null;
  }

  async subscribe(
    subject: string,
    callback: (packet: TransportPacket, reply?: string) => void
  ) {
    if (!this.client) {
      await this.connect();
    }

    this.client.subscribe(subject, (message, reply) => {
      const unpack = this.msgpack.decode(message);
      if (reply) unpack.header['reply'] = reply;

      callback(unpack, reply);
    });
  }

  async sendRequest(
    subject: string,
    packet: TransportPacket
  ): Promise<TransportPacket> {
    if (!this.client) {
      // Connect before send
      await this.connect();
    }

    // Encode into messagepack before send out
    const pack = this.msgpack.encode(packet);
    return new Promise((resolve, reject) => {
      this.client.requestOne(subject, pack, 5_000, (response) => {
        if (response instanceof nats.NatsError) {
          reject(response);
        } else {
          const unpack = this.msgpack.decode(response);
          resolve(unpack);
        }
      });
    });
  }

  async send(subject: string, packet: TransportPacket) {
    return new Promise<void>((resolve) => {
      const pack = this.msgpack.encode(packet);
      this.client.publish(subject, pack, () => resolve());
    });
  }
}
