import { Broker } from '@williele/broker';
import { initTracer } from 'jaeger-client';

const broker = new Broker({
  serviceName: 'bar',
  serializer: { name: 'arvo' },
  transporter: { name: 'nats', options: {} },
  tracer: initTracer(
    {
      serviceName: 'demo-client',
      sampler: { type: 'const', param: 1 },
      reporter: { logSpans: false },
    },
    {}
  ),
});

async function main() {
  await broker.start();

  const client = broker.createClient('test');
  const result = await client.call('demo.hello', { name: 'Williele' });
  console.log(result);
}

main().catch((error) => console.error(error));
