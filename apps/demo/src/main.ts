import { NatsTransporter } from '@wi/broker';

async function main() {
  const nats = new NatsTransporter({
    maxReconnectAttempts: -1,
  });

  await nats.connect();

  nats.subscribe('hello', (message, reply) => {
    const name = message.body.toString();
    if (reply) nats.send(reply, { body: Buffer.from(`hello ${name}`) });
  });

  const res = await nats.sendRequest('hello', {
    header: { method: 'hello' },
    body: Buffer.from('foo'),
  });
  console.log(res.body.toString());
}

main().catch((error) => console.error(error));
