import { TransportPacket } from './interface';
import { BaseSerializer } from './serializer';
import { BaseTransporter } from './transporter';

export class Context<I = unknown, O = unknown> {
  packet: TransportPacket;
  req: Request<I>;
  res: Response<O>;

  readonly serviceName: string;
  readonly serializer: BaseSerializer;
  readonly transporter: BaseTransporter;

  response: (type: O) => void;
}

export const context: Context = {
  packet: undefined,
  req: undefined,
  res: undefined,

  serviceName: undefined,
  serializer: undefined,
  transporter: undefined,

  response(type) {
    this.res.body = type;
  },
};

export interface Request<T = unknown> {
  packet: TransportPacket;
  header: Record<string, string>;
  body: T;

  service: string;
}

export const request: Request = {
  packet: undefined,
  body: undefined,

  get header() {
    return this.packet.header;
  },

  get service() {
    return this.header['service'];
  },
};

export interface Response<T = unknown> {
  packet: TransportPacket;
  header: Record<string, string>;
  body: T;

  setHeader(name: string, val: string);
}

export const response: Response = {
  packet: undefined,
  body: undefined,

  get header() {
    return this.packet.header;
  },

  setHeader(name, val) {
    this.header[name] = val;
  },
};
