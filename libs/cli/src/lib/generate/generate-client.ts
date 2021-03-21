import { NamedRecordType, SchemaType, ServiceSchema } from '@williele/broker';
import { GenerateConfig } from '../interface';
import {
  CallFunctionNode,
  ClassNode,
  ClassPropertyNode,
  FileGenerator,
  FunctionNode,
  ImportsNode,
  InterfaceNode,
  TypeNode,
  ValueNode,
  VariableNode,
} from './generators';

const hideTypes = ['ServiceSchema', 'Null'];

export function generateClient(
  serviceName: string,
  schema: ServiceSchema,
  config: GenerateConfig
) {
  const file = new FileGenerator();

  const imports = new ImportsNode();
  file.addNodes(imports);

  imports.addImport('@williele/broker', 'ExtractClient', 'Broker');
  if (config.forNest === true) {
    imports.addImport('@williele/broker-nest', 'InjectBroker');
    imports.addImport('@nestjs/common', 'Injectable');
  }

  // Generate types
  Object.values(schema.types).forEach((schema) => {
    const type: NamedRecordType = JSON.parse(schema);
    // Hidden type
    if (hideTypes.includes(type.name)) return;

    const iter = new InterfaceNode(type.name);
    iter.export = true;
    file.addNodes(iter);

    if (type.deprecated) iter.comments.push('@deprecated');
    if (type.description) iter.comments.push(type.description);

    Object.entries(type.fields)
      .map(([name, type]) => {
        return { name, type };
      })
      .sort((a, b) => a.type.order - b.type.order)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .forEach((field: { name: string; type: any }) => {
        const variable = new VariableNode(
          field.name,
          new TypeNode(toType(field.type))
        );

        if (field.type.deprecated) variable.comments.push('@deprecated');
        if (field.type.description)
          variable.comments.push(field.type.description);
        variable.optional = field.type.nullable;
        iter.addField(variable);
      });
  });

  // Generate client
  const clientClass = new ClassNode(
    titleCase(`${serviceName}Client`),
    'ExtractClient'
  );
  clientClass.export = true;
  file.addNodes(clientClass);

  // Decorators
  if (config.forNest === true)
    clientClass.decorators.push(new CallFunctionNode('Injectable'));
  // Comment
  clientClass.comments.push(`Extract client for ${'auth'} service`);
  // Constructor
  clientClass.constructorFn = new FunctionNode('constructor');
  clientClass.constructorFn.arguments.push(
    new VariableNode(
      config.forNest ? '@InjectBroker() broker' : 'broker',
      new TypeNode('Broker')
    )
  );
  clientClass.constructorFn.blocks.push(
    new CallFunctionNode(
      'super',
      new ValueNode('broker'),
      new ValueNode(serviceName, true)
    )
  );

  function methodGeneric(name: string) {
    if (name === 'Null') return new TypeNode('null');
    else return new TypeNode(name);
  }

  Object.entries(schema.methods).forEach(([name, config]) => {
    const propName = name.split('.').join('_');
    if (propName.startsWith('metadata')) return;

    const method = new CallFunctionNode(
      'this.createMethod',
      new ValueNode(name, true)
    );
    // method generics
    method.generics.push(
      methodGeneric(config.request),
      methodGeneric(config.response)
    );

    const props = new VariableNode(propName);
    props.comments.push('@method');
    if (config.description) props.comments.push(config.description);

    clientClass.addProperty(new ClassPropertyNode(props, method, 'public'));
  });

  return file.toText();
}

function titleCase(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function toType(type: SchemaType) {
  const t = typeof type === 'string' ? { type } : type;

  switch (t.type) {
    case 'null':
      return 'null';

    case 'boolean':
      return 'boolean';

    case 'int':
    case 'long':
    case 'float':
    case 'double':
      return 'number';

    case 'bytes':
      return 'Buffer';

    case 'timestamp':
      return 'Date';

    case 'string':
      return 'string';

    case 'pointer':
      return t.pointer;

    case 'map':
      return `Record<string, ${toType(t.values)}>`;

    case 'enum':
      return t.symbols.map((s) => `'${s}'`).join(' | ');

    case 'array':
      return `${toType(t.items)}[]`;

    case 'union':
      return Array.from(new Set(t.union.map((t) => toType(t)))).join(' | ');

    default:
      return 'unknown';
  }
}
