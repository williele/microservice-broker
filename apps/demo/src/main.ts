import { Broker } from '@wi/broker';

const broker = new Broker({
  serviceName: 'bar',
  serializer: { name: 'arvo' },
  transporter: { name: 'nats', options: {} },
});

async function main() {
  await broker.start();

  console.log(await broker.call('test', 'demo.hello', { name: 'Willie' }));
}

main().catch((error) => console.error(error));
