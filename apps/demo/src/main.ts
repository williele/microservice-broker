import {
  Broker,
  Context,
  ExtractClient,
  Field,
  Record,
  ServiceSchema,
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
    signals: [{ record: InitSignal }],
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

serviceBroker.onSignal<InitSignal>(InitSignal.name, ({ payload }, error) => {
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

class TestClient extends ExtractClient {
  constructor(broker: Broker, schema: ServiceSchema) {
    super(broker, schema);
  }

  readonly methods = {
    hello: this.createMethod<HelloInput, HelloMessage>('hello'),
  };

  readonly commands = {
    init: this.createCommandMessage<InitCommand>('init'),
    initCallback: this.createCommandCallback<InitCommand>('init'),
  };

  readonly signals = {
    init: this.createSignalHandler<InitSignal>(InitSignal.name),
  };
}

async function main() {
  await serviceBroker.start();

  console.log(serviceBroker.getSchema());

  const client = new TestClient(clientBroker, serviceBroker.getSchema());
  client.commands.initCallback(({ payload }, error) => {
    if (error) {
      console.log('COMMAND ERROR:', error.message);
    }
    console.log('COMMAND CALLBACK:', payload);
  });

  client.signals.init({
    async handler(ctx) {
      console.log('SIGNAL RECEIVE:', ctx.body);
    },
  });

  await clientBroker.start();

  const commandMsg = await client.commands.init({ name: 'williele' });
  console.log('COMMAND:', commandMsg);
  // Client emit command to Service
  await clientBroker.emit(commandMsg);

  const signalMsg = await serviceBroker.createSignal<InitSignal>(
    'baz',
    InitSignal.name,
    { message: 'Hello there' }
  );
  console.log('SIGNAL:', signalMsg);
  await serviceBroker.emit(signalMsg);
}

main().catch((error) => console.error(error));
