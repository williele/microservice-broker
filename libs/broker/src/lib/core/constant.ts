import { NamedSchemaType } from './schema/interface';

export const CONNECT_EVENT = 'connect';
export const DISCONNECT_EVENT = 'disconnect';
export const RECONNECT_EVENT = 'reconnect';
export const ERROR_EVENT = 'error';

export const NullType: NamedSchemaType = { name: 'NullType', type: 'null' };
export const StringType: NamedSchemaType = {
  name: 'StringType',
  type: 'string',
};
export const BrokerSchemaType: NamedSchemaType = {
  name: 'BrokerSchemaType',
  type: 'record',
  fields: {
    types: {
      type: 'map',
      values: 'string',
    },
    methods: {
      type: 'map',
      values: {
        type: 'record',
        fields: {
          requestType: 'string',
          responseType: 'string',
        },
      },
    },
  },
};
