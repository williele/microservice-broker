import { validate } from './validate';

describe('Config validate', () => {
  it('should validate correctly', () => {
    const valid = validate({
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
            'nest-service': {
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

    expect(valid).toBeTruthy();
  });
});
