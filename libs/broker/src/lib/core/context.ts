import { TransportPacket } from './interface';
import { BaseSerializer } from './serializer';
import { BaseTransporter } from './transporter';

export interface Context<I = unknown, O = unknown> {
  packet: TransportPacket;
  body: I;
  res: Response<O>;

  readonly serviceName: string;
  readonly serializer: BaseSerializer;
  readonly transporter: BaseTransporter;

  /**
   * Get list of headers
   */
  headers(): Record<string, string>;

  /**
   * Get a header by name
   * @param name
   * @returns
   */
  header(name: string): string;

  /**
   * Set response header
   * @param name
   * @param val
   */
  setHeader(name: string, val: string): void;

  /**
   * Set response body
   * @param type
   */
  response(type: O): void;
}

export interface Response<T = unknown> {
  header: Record<string, string>;
  body: T;

  /**
   * Set response header
   * @param name
   * @param val
   */
  setHeader(name: string, val: string): void;
}

export const defaultContext: Context = {
  packet: undefined,
  body: undefined,
  res: undefined,

  serviceName: undefined,
  serializer: undefined,
  transporter: undefined,

  headers() {
    return this.packet.header || {};
  },

  header(name: string) {
    return this.headers()[name];
  },

  setHeader(name: string, val: string): void {
    this.res.setHeader(name, val);
  },

  response(type): void {
    this.res.body = type;
  },
};

export const defaultResponse: Response = {
  header: {},
  body: undefined,

  setHeader(name: string, val: string) {
    this.header[name.toLowerCase().trim()] = val;
  },
};
