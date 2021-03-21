import { BaseTransporter } from './transporter';
import { TransportPacket } from '../interface';
import type { ConnectionOptions, NatsConnection, MsgHdrs } from 'nats';
import { packageLoader } from '../utils/package-loader';
import { RequestTimeOutError, TransporterError } from '../error';

let nats: typeof import('nats') = undefined;

/**
 * Nats transporter dependencies
 * - nats
 */
export class NatsTransporter extends BaseTransporter {
  transporterName = 'nats';

  private connection: NatsConnection;

  constructor(
    private readonly serviceName: string,
    private clientOps: ConnectionOptions
  ) {
    super();

    nats = packageLoader('nats', 'NatsTransporter', () => require('nats'));
  }

  async connect() {
    if (this.connection) return;

    this.connection = await nats.connect({
      ...this.clientOps,
    });

    (async () => {
      this.onConnect();
      for await (const s of this.connection.status()) {
        console.info(`${s.type}: ${s.data}`);
        switch (s.type) {
          case nats.Events.Error:
            this.onError(s.data);
            break;
          case nats.Events.Disconnect:
            this.onDisconnect();
            break;
          case nats.Events.Reconnect:
            this.onReconnect();
            break;
          default:
            break;
        }
      }
    })().then();
  }

  async disconnect() {
    if (!this.connection) return;

    await this.connection.flush();
    await this.connection.close();
    this.connection = null;
  }

  private headers(packetHeaders: Record<string, string>) {
    const headers = nats.headers();
    Object.entries(packetHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
    return headers;
  }

  private toHeaders(header: MsgHdrs): Record<string, string> {
    return Array.from(header).reduce(
      (obj, [key, value]) =>
        Object.assign(obj, { [key.toLowerCase()]: value.join('') }),
      {}
    );
  }

  async subscribe(
    subject: string,
    callback: (packet: TransportPacket, reply?: string) => void
  ) {
    if (!this.connection) {
      await this.connect();
    }

    this.connection.subscribe(subject, {
      queue: `${this.serviceName}_queue`,
      callback: (err, msg) => {
        if (err) {
          console.error(`Transport receive '${subject}' error`, err.message);
          return;
        }

        const header = this.toHeaders(msg.headers);
        header['reply'] = msg.reply;

        callback({
          header,
          body: Buffer.from(msg.data),
        });
      },
    });
  }

  async sendRequest(
    subject: string,
    packet: TransportPacket
  ): Promise<TransportPacket> {
    if (!this.connection) {
      // Connect before send
      await this.connect();
    }

    // Encode into messagepack before send out
    try {
      const h = this.headers(packet.header);
      const nc = await this.connection.request(subject, packet.body, {
        timeout: 5_000,
        headers: h,
      });

      return {
        header: this.toHeaders(nc.headers),
        body: Buffer.from(nc.data),
      };
    } catch (err) {
      switch (err.code) {
        case nats.ErrorCode.NoResponders:
          throw new TransporterError('No service is listening');
        case nats.ErrorCode.Timeout:
          throw new RequestTimeOutError('Service did not response in time');
        default:
          throw new TransporterError(err.message);
      }
    }
  }

  async send(subject: string, packet: TransportPacket) {
    const headers = this.headers(packet.header);
    return this.connection.publish(subject, packet.body, { headers });
  }
}
