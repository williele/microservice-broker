import { Broker, Context, DuplicateError } from '@williele/broker';

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
const service = serviceBroker.createService('main');
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
    throw new DuplicateError();
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
  await Promise.all([serviceBroker.start(), clientBroker.start()]);

  const value: { name: string } = { name: 'williele' };
  const message = await client.commandMessage('main.init', value);

  await client.command(message);

  // await clientBroker.requestRaw(message.subject, message.packet);

  // console.log(message);

  // const result = await client.call('main.hello', {
  //   name: 'Willie Le',
  //   length: 5,
  // });
  // console.log(result.body);
}

main().catch((error) => console.error(error));
