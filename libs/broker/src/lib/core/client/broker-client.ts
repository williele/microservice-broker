import { Broker } from '../broker';
import { BrokerConfig } from '../interface';
import { ServiceSchema } from '../server';
import { Server } from '../server/server';

/**
 * Use for send signal or publish event
 */
export class BrokerClient {
  private schema: ServiceSchema;

  constructor(
    private readonly broker: Broker,
    private readonly config: BrokerConfig,
    private readonly server: Server
  ) {}

  async start() {
    this.schema = this.server.getSchema();
  }
}
