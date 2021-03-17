import { Broker, NatsTransporter, ArvoSerializer, Context } from '@wi/broker';

const server = new Broker({
  serviceName: 'foo',
  serializer: ArvoSerializer,
  transporter: new NatsTransporter({}),
});

server.addType({
  name: 'HelloMessage',
  type: 'record',
  fields: {
    message: { type: 'string', order: 1 },
  },
});
server.addType({
  name: 'HelloInput',
  type: 'record',
  fields: {
    name: { type: 'string', order: 1 },
  },
});

const mainService = server.createService('main');

mainService.method({
  name: 'hello',
  request: 'HelloInput',
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

  const fooClient = client.createClient('foo');

  const foo = await fooClient.call('main.hello', { name: 'Foo' });
  console.log(foo);
  const bar = await fooClient.call('main.hello', { name: 'Bar' });
  console.log(bar);
}

main().catch((error) => console.error(error));
