import { Broker } from '../broker';
import { ExtractClientMethod } from '../interface';
import { Client } from './client';
import { Packet } from './interface';

/**
 * Create a client model for another service
 */
export class ExtractClient {
  private client: Client;

  /**
   * Create extract client for another service
   * @param broker
   * @param serviceName
   * @param schema Default schema, if given client won't fetch schema from target service
   */
  constructor(broker: Broker, serviceName: string) {
    this.client = broker.createClient(serviceName);
  }

  protected createMethod<I = unknown, O = unknown>(
    name: string,
    defaultHeader: Packet['header'] = {}
  ): ExtractClientMethod<I, O> {
    return (input: I, header: Packet['header'] = {}) =>
      this.client
        .call<O>(name, input, { ...defaultHeader, ...header })
        .then((r) => r.body);
  }
}
