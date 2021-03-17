import { Broker } from '../broker';
import { NullType } from '../constant';
import { RequestHandler } from '../interface';
import { NamedRecordType } from '../schema';
import { Service } from '../service';

/**
 * Broker schema type
 */
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

/**
 * A metadata service serve all kind of information about this broker
 */
export class MetadataService extends Service {
  constructor(broker: Broker) {
    super(broker, 'metadata');

    this.method({
      name: '_schema',
      request: NullType.name,
      response: BrokerSchemaType,
      handler: this.schema,
    });
  }

  private schema: RequestHandler = (ctx) => {
    ctx.response(this.broker.getSchema());
  };
}
