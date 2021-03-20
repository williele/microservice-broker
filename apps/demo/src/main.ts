import { Broker, ExtractClient } from '@williele/broker';
import { initTracer } from 'jaeger-client';

const broker = new Broker({
  serviceName: 'bar',
  serializer: { name: 'arvo' },
  transporter: { name: 'nats', options: {} },
  tracer: initTracer(
    {
      serviceName: 'test-client',
      sampler: { type: 'const', param: 1 },
      reporter: { logSpans: false },
    },
    {
      logger: {
        info: console.log,
        error: console.error,
      },
    }
  ),
  disableServer: true,
});

class TestClient extends ExtractClient {
  constructor(broker: Broker) {
    super(broker, 'test');
  }

  readonly hello = this.createMethod<{ name: string }, { age: 'number' }>(
    'demo.hello'
  );
}

async function main() {
  const client = new TestClient(broker);
  await broker.start();

  const result = await client.hello({ name: 'demo' });
  console.log(result.age);
}

main().catch((error) => console.error(error));
