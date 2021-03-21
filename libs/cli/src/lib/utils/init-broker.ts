import { Broker, Client, ServiceSchema } from '@williele/broker';
import { ServiceConfig } from '../interface';

export async function initBroker(config: ServiceConfig): Promise<Broker> {
  const broker = new Broker({
    serviceName: config.name,
    serializer: config.serializer,
    transporter: config.transporter,
    disableServer: true,
  });

  await broker.start();

  return broker;
}

export function initClient(broker: Broker, serviceName: string): Client {
  return broker.createClient(serviceName);
}

export async function initServiceSchema(
  client: Client
): Promise<ServiceSchema> {
  const schema = await client.fetchSchema();
  return schema;
}
