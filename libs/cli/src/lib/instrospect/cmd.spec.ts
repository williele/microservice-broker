import { Configure } from '../config/config';
import { introspect } from './cmd';

describe('Introspect', () => {
  it('should introspect', async () => {
    const config = new Configure({
      sources: {
        default: {
          serializer: 'arvo',
          transporter: {
            name: 'nats',
            options: { servers: ['http://localhost:4444'] },
          },
        },
      },
      services: {
        nest_gateway: {
          serviceName: 'gateway',
          schema: 'tmp/nest-gateway/broker-schema.json',
          generate: {
            output: 'node_module/.broker/nest_gateway',
          },
          dependencies: {
            nest_service: { alias: 'nest' },
          },
        },
        nest_service: {
          serviceName: 'nest',
          schema: 'tmp/nest-service/broker-schema.json',
        },
      },
    });

    await introspect(config);
  });
});
