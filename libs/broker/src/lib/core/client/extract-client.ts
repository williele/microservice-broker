import { Broker } from '../broker';
import {
  ExtractClientMethod,
  ExtractCommandCallback,
  ExtractCommandMessage,
} from './interface';
import { AddSignalConfig, ServiceSchema } from '../server';
import { Client } from './client';
import { Packet } from './interface';

/**
 * Create a client model for another service
 */
export class ExtractClient {
  private client: Client;
  public readonly peerService: string;

  /**
   * Create extract client for another service
   * @param broker
   * @param serviceName
   * @param schema Default schema, if given client won't fetch schema from target service
   */
  constructor(private readonly broker: Broker, schema: ServiceSchema) {
    this.client = broker.createClient(schema);
    this.peerService = this.client.peerService;
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

  protected createCommandMessage<I = unknown>(
    command: string
  ): ExtractCommandMessage<I> {
    return (input: I) => this.client.createCommand(command, input);
  }

  protected createCommandCallback<I = unknown>(
    command: string
  ): ExtractCommandCallback<I> {
    return (handler) => this.client.onCommand(command, handler);
  }

  protected createSignalHandler<I = unknown>(signal: string) {
    return (config: Omit<AddSignalConfig<I>, 'type' | 'service' | 'name'>) => {
      this.broker.add({
        type: 'signal',
        service: this.peerService,
        name: signal,
        middlewares: config.middlewares,
        handler: config.handler,
      });
    };
  }
}
