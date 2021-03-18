import { Broker, NatsTransporter, ArvoSerializer } from '@wi/broker';

const broker = new Broker({
  serviceName: 'bar',
  serializer: ArvoSerializer,
  transporter: new NatsTransporter({}),
});

async function main() {
  await broker.start();

  console.log(await broker.call('test', 'demo.hello', { name: 'Willie' }));
}

main().catch((error) => console.error(error));
