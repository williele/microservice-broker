import { Span } from 'opentracing';
import { Broker } from '../broker';
import { ServiceSchema } from '../server';
import { Client } from './client';

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
  constructor(broker: Broker, serviceName: string, schema?: ServiceSchema) {
    this.client = broker.createClient(serviceName);
    if (schema) this.client.setSchema(schema);
  }

  protected createMethod<I = unknown, O = unknown>(name: string) {
    return (input: I, span?: Span) => this.client.call<O>(name, input, span);
  }
}
