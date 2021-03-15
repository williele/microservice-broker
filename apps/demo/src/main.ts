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

  broker.type({
    name: 'HelloMessage',
    type: 'record',
    fields: {
      message: 'string',
    },
  });

  broker.method({
    name: 'hello',
    request: { name: 'HelloInput', type: 'string' },
    response: 'HelloMessage',
    handler(ctx: Context<string, { message: string }>) {
      ctx.response({ message: `hello ${ctx.req.body}` });
    },
  });

  await broker.start();

  const hello = await nats.sendRequest('foo_rpc', {
    header: { method: 'hello' },
    body: broker.encode('HelloInput', 'Willie'),
  });

  console.log(broker.decode('HelloMessage', hello.body));
}

main().catch((error) => console.error(error));
