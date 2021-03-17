import {
  Broker,
  NatsTransporter,
  ArvoSerializer,
  Context,
  Record,
  Field,
} from '@wi/broker';

@Record()
class HelloInput {
  @Field({ type: 'string', order: 1 })
  name: string;
}

@Record()
class HelloMessage {
  @Field({ type: 'string', order: 1 })
  message: string;
}

const server = new Broker({
  serviceName: 'foo',
  serializer: ArvoSerializer,
  transporter: new NatsTransporter({}),
});

const mainService = server.createService('main');

mainService.method({
  name: 'hello',
  request: HelloInput,
  response: HelloMessage,
  handler(ctx: Context<HelloInput, HelloMessage>) {
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
