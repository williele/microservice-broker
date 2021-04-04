import { Broker, Context, Field, Record } from '@williele/broker';

@Record()
class InitCommand {
  @Field(1, 'string')
  name: string;
}

@Record()
class HelloInput {
  @Field(1, 'string')
  name: string;
}

@Record()
class HelloMessage {
  @Field(1, 'string')
  message: string;
}

@Record()
class InitSignal {
  @Field(1, 'string')
  message: string;
}

const serviceBroker = new Broker({
  serviceName: 'bar',
  serializer: { name: 'arvo' },
  transporter: {
    name: 'nats',
    options: {
      servers: ['http://localhost:4444'],
    },
  },
  server: {
    signals: {
      init: { record: InitSignal },
    },
  },
});

serviceBroker.add({
  type: 'command',
  name: 'init',
  request: InitCommand,
  async handler(ctx: Context<InitCommand>) {
    console.log(ctx.body);
  },
});

serviceBroker.add({
  type: 'method',
  name: 'hello',
  request: HelloInput,
  response: HelloMessage,
  handler(ctx: Context<HelloInput, HelloMessage>) {
    ctx.response({
      message: `Hello ${ctx.body.name}`,
    });
  },
});

const clientBroker = new Broker({
  serviceName: 'baz',
  serializer: { name: 'arvo' },
  transporter: {
    name: 'nats',
    options: {
      servers: ['http://localhost:4444'],
    },
  },
});

async function main() {
  await serviceBroker.start();

  const signal = serviceBroker.encodeSignal<InitSignal>('init', {
    message: 'awesome',
  });
  console.log(signal);

  const client = clientBroker.createClient('bar');
  console.log(await client.call('hello', { name: 'williele' }));
}

main().catch((error) => console.error(error));
