import { Broker } from '@wi/broker';
import { initTracer } from 'jaeger-client';

const broker = new Broker({
  serviceName: 'bar',
  serializer: { name: 'arvo' },
  transporter: { name: 'nats', options: {} },
  tracer: initTracer(
    {
      serviceName: 'demo-client',
      sampler: { type: 'const', param: 1 },
      reporter: { logSpans: true },
    },
    {
      logger: {
        info(msg) {
          console.log('INFO ', msg);
        },
        error(msg) {
          console.log('ERROR', msg);
        },
      },
    }
  ),
});

async function main() {
  await broker.start();

  const span = broker.tracer.startSpan('demo_request');
  console.log(
    await broker.call('test', 'demo.hello', { name: 'Willie' }, span)
  );
  span.finish();
}

main().catch((error) => console.error(error));
