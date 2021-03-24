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
        core: {
          serializer: 'arvo',
          transporter: {
            name: 'nats',
            options: { servers: ['http://localhost:4222'] },
          },
        },
      },
      externals: {
        user: {
          source: 'core',
        },
      },
      services: {
        nest_gateway: {
          serviceName: 'gateway',
          schema: 'apps/nest-gateway/broker-schema.json',
          dependencies: {
            nest_service: {
              alias: 'nest',
            },
          },
        },
        nest_service: {
          serviceName: 'nest',
          schema: 'apps/nest-service/broker-schema.json',
        },
      },
    });

    await introspect(config);
  });
});
