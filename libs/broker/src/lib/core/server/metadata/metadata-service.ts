import { Server } from '../server';
import { RequestHandler } from '../interface';
import { Service } from '../service';
import { ServiceSchemaRecord } from '../../serializer';

/**
 * A metadata service serve all kind of information about this broker
 */
export class MetadataService extends Service {
  constructor(server: Server) {
    super(server, 'metadata');

    this.method({
      name: '_schema',
      request: 'Null',
      response: ServiceSchemaRecord,
      handler: this.schema,
      description: 'Get service schema',
    });
  }

  private schema: RequestHandler = (ctx) => {
    ctx.response(this.server.getSchema());
  };
}
