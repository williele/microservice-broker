import { generateService } from './generate-service';

describe('Generate service', () => {
  it('should generate correctly', async () => {
    await generateService({
      name: 'test',
      serializer: { name: 'arvo' },
      transporter: {
        name: 'nats',
        options: { servers: ['http://localhost:4444'] },
      },
      generate: {
        dir: 'test/generated',
        dependencies: {
          nest: {
            name: 'nest',
          },
        },
      },
    });

    //
  });
});
