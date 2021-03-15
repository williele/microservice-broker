import {
  Broker,
  NatsTransporter,
  ArvoSerializer,
  Context,
  HandlerMiddleware,
} from '@wi/broker';

function testMiddleware(name: string): HandlerMiddleware {
  return async (_, next) => {
    console.log(`-- before ${name}`);
    await next();
    console.log(`-- after ${name}`);
  };
}

async function main() {
  const nats = new NatsTransporter({
    maxReconnectAttempts: -1,
  });

  const broker = new Broker({
    serviceName: 'foo',
    serializer: ArvoSerializer,
    transporter: nats,
  });

  broker.method({
    name: 'hello',
    requestType: { name: 'HelloInput', type: 'string' },
    responseType: { name: 'Hello', type: 'string' },
    middlewares: [
      testMiddleware('foo'),
      testMiddleware('bar'),
      testMiddleware('baz'),
    ],
    handler(ctx: Context<string, string>) {
      console.log('handling');
      ctx.output = `hello ${ctx.body}`;
    },
  });

  await broker.start();

  const hello = await nats.sendRequest('foo_rpc', {
    header: { method: 'hello' },
    body: broker.encode('HelloInput', 'Duy'),
  });

  console.log(broker.decode('Hello', hello.body));
}

main().catch((error) => console.error(error));
