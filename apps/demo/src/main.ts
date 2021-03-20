import { Broker, ExtractClient } from '@williele/broker';
import { initTracer } from 'jaeger-client';

const broker = new Broker({
  serviceName: 'bar',
  serializer: { name: 'arvo' },
  transporter: {
    name: 'nats',
    options: {
      servers: ['http://localhost:4444'],
    },
  },
  tracer: initTracer(
    {
      serviceName: 'test-client',
      sampler: { type: 'const', param: 1 },
      reporter: { logSpans: false },
    },
    {}
  ),
  disableServer: true,
});

class TestClient extends ExtractClient {
  constructor(broker: Broker) {
    super(broker, 'nest');
  }

  readonly getData = this.createMethod('main.getData');

  // readonly hello = this.createMethod<{ name: string }, { age: 'number' }>(
  //   'demo.hello'
  // );

  // readonly demo = this.createMethod<{ name: string }, { age: 'number' }>(
  //   'demo.demo'
  // );
}

async function main() {
  const client = new TestClient(broker);
  await broker.start();

  // const hello = await client.hello({ name: 'demo' });
  // console.log(hello.age);
  const demo = await client.getData(null);
  console.log(demo);
}

main().catch((error) => console.error(error));
