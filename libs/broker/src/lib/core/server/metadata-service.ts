import { Server } from './server';
import { RequestHandler } from './interface';
import { BaseService } from './service';
import { ServiceSchemaRecord } from '../serializer';

/**
 * A metadata service serve all kind of information about this broker
 */
export class MetadataService extends BaseService {
  constructor(server: Server) {
    super(server, 'metadata');

    // this.handle({
    //   name: '_schema',
    //   response: ServiceSchemaRecord,
    //   handler: this.schema,
    //   description: 'Get service schema',
    // });
  }

  private schema: RequestHandler = (ctx) => {
    ctx.response(this.server.getSchema());
  };
}
