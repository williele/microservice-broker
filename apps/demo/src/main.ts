import {
  Broker,
  Context,
  ExtractClient,
  ValidateError,
} from '@williele/broker';

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
const service = serviceBroker.service('command', 'main');
service.command({
  name: 'init',
  request: {
    name: 'InitCommand',
    fields: {
      name: { order: 1, type: 'string' },
    },
  },
  async handler(ctx: Context<{ name: string }>) {
    console.log(ctx.body);
    throw ValidateError.fields({ name: 'unique' });
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

class TestClient extends ExtractClient {
  constructor(broker: Broker) {
    super(broker, 'bar');
  }

  cmain_init = this.createCommandMessage<{ name: string }>('main.init');
  cmain_init_handler = this.createCommandHandler<{ name: string }>('main.init');
}

async function main() {
  const client = new TestClient(clientBroker);
  client.cmain_init_handler((request, error) => {
    if (error) console.log(error);
    console.log(request.name);
  });

  await serviceBroker.start();

  const value: { name: string } = { name: 'williele' };
  const message = await client.cmain_init(value);

  console.log(message);

  clientBroker.command(message);
}

main().catch((error) => console.error(error));
