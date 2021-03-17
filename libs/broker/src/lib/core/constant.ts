import { NamedRecordType } from './schema/interface';

export const CONNECT_EVENT = 'connect';
export const DISCONNECT_EVENT = 'disconnect';
export const RECONNECT_EVENT = 'reconnect';
export const ERROR_EVENT = 'error';

export const NullType: NamedRecordType = {
  name: 'NullType',
  type: 'record',
  fields: {},
};
