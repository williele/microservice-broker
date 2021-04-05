import { TransportPacket } from '../interface';

export function injectHeader(
  service: string,
  type: string,
  name: string,
  header: TransportPacket['header']
) {
  header['service'] = service;
  header['type'] = type;
  header['name'] = name;
}
