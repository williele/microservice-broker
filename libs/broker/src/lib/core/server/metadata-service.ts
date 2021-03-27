import { Server } from './server';
import { RequestHandler } from './interface';
import { BaseService } from './service';
import { sendResponse } from './handlers';

/**
 * A metadata service serve all kind of information about this broker
 * Not using any special serializer, only JSON stringify and Buffer
 */
export class MetadataService extends BaseService {
  constructor(server: Server) {
    super(server, 'metadata');

    this.handle({
      type: 'method',
      name: '_schema',
      handler: this.schema,
      description: 'Get service schema',
    });
  }

  private schema: RequestHandler = async (ctx) => {
    const schema = this.server.getSchema();
    const buffer = Buffer.from(JSON.stringify(schema));
    ctx.response(buffer);

    await sendResponse(ctx);
  };
}
