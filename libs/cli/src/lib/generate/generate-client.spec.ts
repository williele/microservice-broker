import { NamedRecordType } from '@williele/broker';
import { generateClient } from './generate-client';

describe('Generate client', () => {
  it('should generate client correctly', async () => {
    const foo: NamedRecordType = {
      name: 'Foo',
      type: 'record',
      description: 'Foo dummy record',
      fields: {
        isFoo: { order: 1, type: 'boolean', deprecated: true },
        demo: { order: 2, type: 'enum', symbols: ['owner', 'member'] },
      },
    };

    const demo: NamedRecordType = {
      name: 'Demo',
      type: 'record',
      fields: {
        description: { order: 2, type: 'string', nullable: true },
        name: { order: 1, type: 'string' },
        age: {
          order: 3,
          type: 'int',
          description: 'Age of the demo',
          deprecated: true,
        },
        foos: {
          order: 4,
          type: 'array',
          items: { type: 'pointer', pointer: 'Foo' },
        },
      },
    };

    const text = await generateClient(
      'demo',
      {
        serializer: 'arvo',
        transporter: 'nats',
        types: {
          Demo: JSON.stringify(demo),
          Foo: JSON.stringify(foo),
        },
        methods: {
          'main.fooDemo': {
            request: 'Foo',
            response: 'Demo',
            description: 'Give a foo get a demo',
          },
        },
      },
      {
        dir: 'app/src/generated',
        forNest: true,
        dependencies: {},
      }
    );

    console.log(text);
  });
});
