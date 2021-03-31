import {
  Broker,
  CommandMessage,
  Context,
  DuplicateError,
  Outbox,
  OutboxProcessor,
} from '@williele/broker';
import * as cuid from 'cuid';

class MyOutbox extends Outbox {
  private message: Record<string, CommandMessage> = {};

  add(message: CommandMessage) {
    const id = cuid();
    this.message[id] = message;
    return id;
  }

  async get(id: string) {
    return this.message[id];
  }

  async remove(id: string) {
    delete this.message[id];
  }

  async setError(id: string, message: string) {
    //
  }

  async list() {
    return Object.keys(this.message);
  }
}
const outbox = new MyOutbox();

const serviceBroker = new Broker({
  serviceName: 'bar',
  serializer: { name: 'arvo' },
  transporter: {
    name: 'nats',
    options: {
      servers: ['http://localhost:4444'],
    },
  },
});
const service = serviceBroker.createService('main');
service.command({
  name: 'init',
  request: {
    name: 'InitCommand',
    fields: {
      name: { order: 1, type: 'string' },
    },
  },
  async handler(ctx: Context<{ name: string }>) {
    console.log(ctx.body);
    throw new DuplicateError();
  },
});

const clientBroker = new Broker({
  serviceName: 'baz',
  serializer: { name: 'arvo' },
  transporter: {
    name: 'nats',
    options: {
      servers: ['http://localhost:4444'],
    },
  },
  disableServer: true,
  outbox: { redis: { port: 6380 }, outbox },
});

async function main() {
  const client = clientBroker.createClient('bar');
  await serviceBroker.start();
  await clientBroker.start();

  const value: { name: string } = { name: 'williele' };
  const message = await client.commandMessage('main.init', value);
  const id = outbox.add(message);

  // clientBroker.emitOutbox(id);

  console.log('emit outbox');

  // await client.command(message);

  // await clientBroker.requestRaw(message.subject, message.packet);

  // console.log(message);

  // const result = await client.call('main.hello', {
  //   name: 'Willie Le',
  //   length: 5,
  // });
  // console.log(result.body);
}

main().catch((error) => console.error(error));
