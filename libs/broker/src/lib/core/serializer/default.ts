/**
 * Some default record type
 */

import { NamedRecordType } from '../schema';

/**
 * Null type
 */
export const NullRecord: NamedRecordType = {
  name: 'Null',
  type: 'record',
  fields: {},
};

/**
 * Service schema
 */
export const ServiceSchemaRecord: NamedRecordType = {
  name: 'ServiceSchema',
  type: 'record',
  fields: {
    types: {
      type: 'map',
      // types map need to stringify, because its too complex
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
          description: { type: 'string', order: 3, nullable: true },
        },
      },
      order: 2,
    },
  },
};
