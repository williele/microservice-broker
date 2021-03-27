import { Broker } from '@williele/broker';
import { NestClient } from '.broker/demo';

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
  const client = new NestClient(broker);
  await broker.start();

  const result = await client.main_hello({ name: 'Willie Le', length: 10 });
  console.log(result);
}

main().catch((error) => console.error(error));
