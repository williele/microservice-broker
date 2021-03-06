import { generateDependency } from './generate-dep';

describe('Generate dependencies', () => {
  it('should generate client correctly', () => {
    const result = generateDependency({
      aliasName: 'nest',
      serviceName: 'nest',
      types: {
        Null: {
          name: 'Null',
          type: 'record',
          fields: {},
        },
        ServiceSchema: {
          name: 'ServiceSchema',
          type: 'record',
          fields: {
            types: {
              type: 'map',
              values: 'string',
              order: 1,
            },
            methods: {
              type: 'map',
              values: {
                type: 'record',
                fields: {
                  request: {
                    type: 'string',
                    order: 1,
                  },
                  response: {
                    type: 'string',
                    order: 2,
                  },
                  description: {
                    type: 'string',
                    order: 3,
                    nullable: true,
                  },
                },
              },
              order: 2,
            },
          },
        },
        DemoInput: {
          name: 'DemoInput',
          type: 'record',
          fields: {
            name: {
              order: 1,
              type: 'string',
            },
          },
        },
        DemoOutput: {
          name: 'DemoOutput',
          type: 'record',
          fields: {
            message: {
              order: 1,
              type: 'string',
            },
          },
        },
        DemoListInput: {
          name: 'DemoListInput',
          type: 'record',
          fields: {
            name: {
              order: 1,
              type: 'string',
              min: 2,
            },
            length: {
              order: 2,
              type: 'int',
              min: 5,
            },
          },
        },
        DemoListOutput: {
          name: 'DemoListOutput',
          type: 'record',
          fields: {
            list: {
              order: 1,
              type: 'array',
              items: {
                type: 'pointer',
                pointer: 'DemoOutput',
              },
            },
          },
        },
      },
      methods: {
        'metadata._schema': {
          request: 'Null',
          response: 'ServiceSchema',
          description: 'Get service schema',
        },
        'main.getData': {
          request: 'Null',
          response: 'Null',
          description: null,
        },
        'main.hello': {
          request: 'DemoInput',
          response: 'DemoOutput',
          description: null,
        },
        'main.moreHello': {
          request: 'DemoListInput',
          response: 'DemoListOutput',
          description: null,
        },
      },
    });

    expect(result.declareFile).toBeTruthy();
    expect(result.scriptFile).toBeTruthy();
  });
});
