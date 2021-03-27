import { Broker, Context } from '@williele/broker';
// import { initTracer } from 'jaeger-client';

const broker = new Broker({
  serviceName: 'bar',
  serializer: { name: 'arvo' },
  transporter: {
    name: 'nats',
    options: {
      servers: ['http://localhost:4444'],
    },
  },
  server: {
    records: [
      { name: 'Message', fields: { message: { order: 1, type: 'string' } } },
    ],
  },
  // tracer: initTracer(
  //   {
  //     serviceName: 'test-client',
  //     sampler: { type: 'const', param: 1 },
  //     reporter: { logSpans: false },
  //   },
  //   {}
  // ),
  // disableServer: true,
});

const client = new Broker({
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

// class TestClient extends ExtractClient {
//   constructor(broker: Broker) {
//     super(broker, 'nest');
//   }

//   readonly getData = this.createMethod('main.getData');

//   // readonly hello = this.createMethod<{ name: string }, { age: 'number' }>(
//   //   'demo.hello'
//   // );

//   // readonly demo = this.createMethod<{ name: string }, { age: 'number' }>(
//   //   'demo.demo'
//   // );
// }

const service = broker.createService('main');

service.method({
  name: 'demo',
  request: {
    name: 'DemoInput',
    fields: { name: { order: 1, type: 'string' } },
  },
  response: {
    name: 'DemoOutput',
    fields: { message: { order: 1, type: 'pointer', pointer: 'Message' } },
  },
  handler(ctx: Context<{ name: string }>) {
    // throw ValidateError.fields({ name: 'weird' });
    ctx.response({ message: { message: `hello ${ctx.body.name}` } });
  },
});

async function main() {
  await broker.start();
  await client.start();

  const demoClient = broker.createClient('bar');
  const result = await demoClient.call('main.demo', { name: 'Williele' });
  console.log(result);

  console.log(await demoClient.fetchSchema());
}

main().catch((error) => console.error(error));
