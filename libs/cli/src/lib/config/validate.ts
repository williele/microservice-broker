import Ajv = require('ajv');

const namePattern = '^[a-zA-Z_$][a-zA-Z_$0-9]*$';

const defsSchema = {
  $id: 'http://example.com/schemas/defs.json',
  definitions: {
    // Serializer
    serializer: { type: 'string', enum: ['msgpack', 'arvo'] },
    // Transporter
    transporter: {
      type: 'object',
      properties: {
        name: { type: 'string', enum: ['nats'] },
        options: { type: 'object' },
      },
      allRequired: true,
      additionalProperties: false,
    },
    // Source
    source: {
      type: 'object',
      properties: {
        serializer: { $ref: 'defs.json#/definitions/serializer' },
        transporter: { $ref: 'defs.json#/definitions/transporter' },
      },
      allRequired: true,
      additionalProperties: false,
    },
    // Dependency
    dependency: {
      type: 'object',
      properties: {
        alias: { type: 'string' },
      },
      additionalProperties: false,
    },
    // External service
    external: {
      type: 'object',
      properties: {
        serviceName: { type: 'string' },
        source: { type: 'string' },
      },
      additionalProperties: false,
    },
    // Service
    service: {
      type: 'object',
      properties: {
        serviceName: { type: 'string' },
        source: { type: 'string' },
        schema: { type: 'string' },
        generate: {
          properties: {
            output: { type: 'string' },
          },
          required: ['output'],
        },
        dependencies: {
          type: 'object',
          patternProperties: {
            [namePattern]: { $ref: 'defs.json#/definitions/dependency' },
          },
        },
      },
      additionalProperties: false,
      required: [],
    },
  },
};

const schema = {
  $id: 'http://example.com/schemas/schema.json',
  type: 'object',
  properties: {
    // Sources
    sources: {
      type: 'object',
      patternProperties: {
        [namePattern]: { $ref: 'defs.json#/definitions/source' },
      },
      additionalProperties: false,
      required: ['default'],
    },
    // Externals
    externals: {
      type: 'object',
      patternProperties: {
        [namePattern]: { $ref: 'defs.json#/definitions/external' },
      },
      additionalProperties: false,
    },
    // Services
    services: {
      type: 'object',
      patternProperties: {
        [namePattern]: { $ref: 'defs.json#/definitions/service' },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
  required: ['sources', 'services'],
};

const ajv = new Ajv({
  schemas: [schema, defsSchema],
  coerceTypes: true,
});
export const validate = ajv.getSchema('http://example.com/schemas/schema.json');
