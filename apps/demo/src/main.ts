import { Broker, NatsTransporter, ArvoSerializer, Context } from '@wi/broker';

const nats = new NatsTransporter({
  maxReconnectAttempts: -1,
});

const broker = new Broker({
  serviceName: 'foo',
  serializer: ArvoSerializer,
  transporter: nats,
});

broker.type({
  name: 'HelloMessage',
  type: 'record',
  fields: {
    message: { type: 'string', order: 1 },
  },
});

broker.method({
  name: 'hello',
  request: {
    name: 'HelloInput',
    type: 'record',
    fields: {
      name: { type: 'string', order: 1 },
    },
  },
  response: 'HelloMessage',
  handler(ctx: Context<{ name: string }, { message: string }>) {
    ctx.response({ message: `hello ${ctx.body.name}` });
  },
});

broker
  .start()
  .then(() => {
    return nats.sendRequest('foo_rpc', {
      header: { method: 'hello' },
      body: broker.encode('HelloInput', { name: 'Willie' }),
    });
  })
  .then((hello) => {
    console.log(hello.header);
    if (hello.header.error) {
      console.log('Error', broker.decode('StringType', hello.body));
    } else {
      console.log(broker.decode('HelloMessage', hello.body));
    }
  })
  .catch((error) => console.error(error));
