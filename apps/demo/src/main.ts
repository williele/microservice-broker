import { Broker, Context } from '@williele/broker';

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
  disableServer: true,
});

async function main() {
  const client = clientBroker.createClient('bar');
  await serviceBroker.start();
  await clientBroker.start();

  console.log(await client.fetchSchema());

  const value: { name: string } = { name: 'williele' };
  const message = await client.commandMessage('main.init', value);
  // console.log(message);
  await client.command(message);
}

main().catch((error) => console.error(error));
