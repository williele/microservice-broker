import { Server } from '../server';
import { AddSagaConfig } from './interface';
import { BaseService } from './service';

/**
 * Saga service use for self call
 * success or failed handler
 */
export class SagaService extends BaseService {
  constructor(server: Server, namespace: string) {
    super(server, namespace);
  }

  saga(config: AddSagaConfig) {
    return this.handle({
      name: config.name,
      type: 'saga',
      handler: config.handler,
    });
  }
}
