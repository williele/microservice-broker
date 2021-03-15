import { Broker, NatsTransporter, ArvoSerializer, Context } from '@wi/broker';

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
    handler(ctx: Context<string>) {
      return `hello ${ctx.body}`;
    },
  });

  await broker.start();

  // const result = await nats.sendRequest('foo_rpc', {
  //   header: { method: '_metadata' },
  //   body: broker.encode('NullType', null),
  // });
  // console.log(result);

  const hello = await nats.sendRequest('foo_rpc', {
    header: { method: 'hello' },
    body: broker.encode('HelloInput', 'Duy'),
  });
  console.log(broker.decode('Hello', hello.body));
}

main().catch((error) => console.error(error));
