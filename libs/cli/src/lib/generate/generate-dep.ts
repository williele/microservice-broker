import type {
  MethodInfo,
  NamedRecordType,
  ServiceSchema,
} from '@williele/broker';
import {
  AssignmentNode,
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
import { toType } from './to-type';

export function generateDependency(
  aliasName: string,
  serviceSchema: ServiceSchema
) {
  const declareFile = new FileGenerator();
  const scriptFile = new FileGenerator();

  const dImports = new ImportsNode();
  declareFile.addNodes(dImports);
  dImports.addImport(
    '@williele/broker',
    'ExtractClient',
    'ExtractClientMethod',
    'Broker'
  );

  const sImports = new ImportsNode();
  scriptFile.addNodes(sImports);
  sImports.isJs = true;
  sImports.addImport('@williele/broker', 'ExtractClient');

  Object.values(serviceSchema.records).forEach((record) => {
    const inter = generateType(record);
    if (!inter) return;

    declareFile.addNodes(inter);
  });

  const [dClass, sClass] = generateClient(
    aliasName,
    serviceSchema.serviceName,
    serviceSchema.methods
  );

  declareFile.addNodes(dClass);
  scriptFile.addNodes(sClass);

  return { declareFile, scriptFile };
}

function generateType(record: NamedRecordType): InterfaceNode {
  const node = new InterfaceNode(record.name);
  node.export = true;

  // Hidden type
  if (record.deprecated) node.comments.push('@deprecated');
  if (record.description) node.comments.push(record.description);

  Object.entries(record.fields)
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
      node.addField(variable);
    });

  return node;
}

function generateClient(
  aliasName: string,
  serviceName: string,
  methods: Record<string, MethodInfo>
) {
  const className = clientClassName(aliasName);

  // Declare class
  const dNode = new ClassNode(className, 'ExtractClient');
  dNode.export = true;
  dNode.declare = true;

  // Script class
  const sNode = new ClassNode(className, 'ExtractClient');
  sNode.isJS = true;
  sNode.export = true;
  sNode.declare = true;

  // Constructor
  dNode.constructorFn = new FunctionNode('constructor');
  dNode.constructorFn.arguments.push(
    new VariableNode('broker', new TypeNode('Broker'))
  );
  dNode.constructorFn.declare = true;

  sNode.constructorFn = new FunctionNode('constructor');
  sNode.constructorFn.arguments.push(new VariableNode('broker'));
  sNode.constructorFn.blocks.push(
    new CallFunctionNode(
      'super',
      new ValueNode('broker'),
      new ValueNode(serviceName, true)
    )
  );

  // Comment
  dNode.comments.push(`Extract client for ${aliasName} service`);
  sNode.comments.push(`Extract client for ${aliasName} service`);

  function methodGeneric(name: string) {
    if (name === 'Null') return new TypeNode('null');
    else return new TypeNode(name);
  }

  // Properties
  Object.entries(methods).forEach(([name, config]) => {
    const propName = clientPropName(name);
    const type = new TypeNode('ExtractClientMethod');
    type.generics.push(
      methodGeneric(config.request),
      methodGeneric(config.response)
    );

    const dMethod = new VariableNode(`readonly ${propName}`, type);
    dMethod.comments.push('@method');
    if (config.description) dMethod.comments.push(config.description);

    const sMethod = new AssignmentNode(
      new VariableNode(`this.${propName}`),
      new CallFunctionNode('this.createMethod', new ValueNode(name, true))
    );

    dNode.addProperty(new ClassPropertyNode(dMethod));
    // Add in constructor
    sNode.constructorFn.blocks.push(sMethod);
  });

  return [dNode, sNode];
}

export function clientPropName(name: string) {
  return name.split('.').join('_');
}

export function clientClassName(name: string) {
  return titleCase(`${name}Client`);
}

export function titleCase(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
