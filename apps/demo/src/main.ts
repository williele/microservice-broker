import { Broker } from '@williele/broker';

const broker = new Broker({
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
  const client = broker.createClient('nest');
  await broker.start();

  const result = await client.call('main.hello', {
    name: 'Willie Le',
    length: 5,
  });
  console.log(result.body);
}

main().catch((error) => console.error(error));
