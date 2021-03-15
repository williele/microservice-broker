import { Broker, NatsTransporter, ArvoSerializer } from '@wi/broker';

async function main() {
  const nats = new NatsTransporter({
    maxReconnectAttempts: -1,
  });

  const broker = new Broker({
    serviceName: 'foo',
    serializer: ArvoSerializer,
    transporter: nats,
  });

  broker.addMethod({
    name: 'hello',
    requestType: { name: 'HelloInput', type: 'string' },
    responseType: { name: 'Hello', type: 'string' },
    handler() {
      return 'awesome';
    },
  });

  await broker.start();
  const schema = await nats.sendRequest('foo_schema', {
    body: Buffer.from(''),
  });

  console.log(schema.body.length);

  console.log(broker.decode('BrokerSchemaType', schema.body));
}

main().catch((error) => console.error(error));
