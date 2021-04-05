import { Broker } from '../broker';
import { ExtractClientMethod } from '../interface';
import { ServiceSchema } from '../server';
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
  constructor(broker: Broker, schema: ServiceSchema) {
    this.client = broker.createClient(schema);
  }

  getSchema() {
    return this.client.getSchema();
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

  // protected createCommandMessage<I = unknown>(
  //   command: string,
  //   defaultHeader: Packet['header'] = {}
  // ): ExtractCommandMessage<I> {
  //   return (input: I, header: Packet['header'] = {}) =>
  //     this.client.commandMessage(command, input, {
  //       ...defaultHeader,
  //       ...header,
  //     });
  // }

  // protected createCommandHandler<T = unknown>(command: string) {
  //   return (handler: CommandHandler<T>) =>
  //     this.client.commandHandler<T>(command, handler);
  // }
}
