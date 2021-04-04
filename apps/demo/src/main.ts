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

const serviceBroker = new Broker({
  serviceName: 'bar',
  serializer: { name: 'arvo' },
  transporter: {
    name: 'nats',
    options: {
      servers: ['http://localhost:4444'],
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

// class TestClient extends ExtractClient {
//   constructor(broker: Broker) {
//     super(broker, 'bar');
//   }

//   methods = {
//     hello: this.createMethod<HelloInput, HelloMessage>('hello'),
//   };

//   commands = {
//     init: this.createCommandMessage<InitCommand>('init'),
//   };

//   commandHandlers = {
//     init: this.createCommandHandler<InitCommand>('init'),
//   };

//   signal = {};
// }

async function main() {
  // const client = new TestClient(clientBroker);
  // client.commandHandlers.init((request, error) => {
  //   if (error) console.log(error);
  //   console.log(request.name);
  // });

  await serviceBroker.start();

  const client = clientBroker.createClient('bar');
  console.log(await client.call('hello', { name: 'williele' }));

  // Schema
  // console.log(await client.schema());

  // Method
  // const hello = await client.methods.hello({ name: 'Williele' });
  // console.log(hello);

  // Command
  // const message = await client.commands.init({ name: 'williele' });
  // console.log(message);
  // clientBroker.command(message);
}

main().catch((error) => console.error(error));
