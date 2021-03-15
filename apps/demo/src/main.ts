import { Broker, DefaultSerializer, NatsRPCTransporter } from '@wi/broker';

async function main() {
  const nats = new NatsRPCTransporter({
    servers: ['http://localhost:4444'],
  });
  const broker = new Broker({
    serviceName: 'demo',
    serializer: new DefaultSerializer({}),
    rpcTransporter: nats,
  });

  broker.addType({ name: 'HelloMessage', type: 'string' });
  broker.addType({
    name: 'HelloMessageList',
    type: 'array',
    items: { type: 'pointer', pointer: 'HelloMessage' },
  });

  broker.addMethod({
    name: 'hello',
    requestType: {
      name: 'HelloInput',
      type: 'record',
      fields: {
        name: { type: 'string', min: 4 },
      },
    },
    responseType: 'HelloMessage',
    handler(): string {
      return 'hello, world!';
    },
  });

  await broker.start();
  console.log('Connected');

  const result = await nats.sendRequest('demo_schema', {
    method: '_schema',
    body: null,
  });
  console.log(broker.decode('BrokerSchemaType', result.body));
}

main().catch((error) => console.error(error));
