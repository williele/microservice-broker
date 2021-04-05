import {
  Broker,
  Context,
  Field,
  Record,
  ValidateError,
} from '@williele/broker';

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

serviceBroker.add({
  type: 'command',
  name: 'init',
  request: InitCommand,
  async handler(ctx: Context<InitCommand>) {
    console.log('COMMAND RECEIVE:', ctx.body);
    throw ValidateError.fields({ username: 'unique' });
  },
});

serviceBroker.onSignal<InitSignal>('init', ({ payload }, error) => {
  if (error) {
    console.log('SIGNAL ERROR:', error.message);
  }
  console.log('SIGNAL CALLBACK:', payload);
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
clientBroker.add({
  type: 'signal',
  service: 'bar',
  name: 'init',
  async handler(ctx: Context<InitSignal>) {
    console.log('SIGNAL RECEIVE:', ctx.body);
  },
});

async function main() {
  await serviceBroker.start();
  await clientBroker.start();

  const client = clientBroker.createClient('bar');
  client.onCommand<InitCommand>('init', ({ payload }, error) => {
    if (error) {
      console.log('COMMAND ERROR:', error.message);
    }
    console.log('COMMAND CALLBACK:', payload);
  });

  const commandMsg = await client.createCommand<InitCommand>('init', {
    name: 'williele',
  });
  console.log('COMMAND:', commandMsg);
  // Client emit command to Service
  await clientBroker.emit(commandMsg);

  const signalMsg = await serviceBroker.createSignal<InitSignal>(
    'baz',
    'init',
    { message: 'Hello there' }
  );
  console.log('SIGNAL:', signalMsg);
  await serviceBroker.emit(signalMsg);
}

main().catch((error) => console.error(error));
