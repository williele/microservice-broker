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

export const BrokerSchemaType: NamedRecordType = {
  name: 'BrokerSchemaType',
  type: 'record',
  fields: {
    types: {
      type: 'map',
      values: 'string',
      order: 1,
    },
    methods: {
      type: 'map',
      values: {
        type: 'record',
        fields: {
          request: { type: 'string', order: 1 },
          response: { type: 'string', order: 2 },
        },
      },
      order: 2,
    },
  },
};
