import { Configure } from './config';

describe('Configure', () => {
  it('should Configure parse correctly', () => {
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

    expect(Object.keys(config.services)).toEqual([
      'nest_gateway',
      'nest_service',
    ]);
    expect(Object.keys(config.sources)).toEqual(['default']);
    expect(config).toBeTruthy();
  });
});
