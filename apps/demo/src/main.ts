import { Broker, NatsTransporter, ArvoSerializer, Context } from '@wi/broker';

const nats = new NatsTransporter({
  maxReconnectAttempts: -1,
});

const server = new Broker({
  serviceName: 'foo',
  serializer: ArvoSerializer,
  transporter: nats,
});

server.type({
  name: 'HelloMessage',
  type: 'record',
  fields: {
    message: { type: 'string', order: 1 },
  },
});

server.method({
  name: 'hello',
  request: {
    name: 'HelloInput',
    type: 'record',
    fields: {
      name: { type: 'string', order: 1 },
    },
  },
  response: 'HelloMessage',
  handler(ctx: Context<{ name: string }, { message: string }>) {
    ctx.response({ message: `hello ${ctx.body.name}` });
  },
});

const client = new Broker({
  serviceName: 'bar',
  serializer: ArvoSerializer,
  transporter: new NatsTransporter({}),
});

async function main() {
  await Promise.all([server.start(), client.start()]);

  const foo = await client.call('foo', 'hello', { name: 'Foo' });
  console.log(foo);
  const bar = await client.call('foo', 'hello', { name: 'Bar' });
  console.log(bar);
}

main().catch((error) => console.error(error));
