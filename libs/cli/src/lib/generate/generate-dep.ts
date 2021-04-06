import type { NamedRecordType, ServiceSchema } from '@williele/broker';
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
    'ExtractCommandMessage',
    'ExtractCommandCallback',
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

  const [dClass, sClass] = generateClient(aliasName, serviceSchema);

  declareFile.addNodes(dClass);
  scriptFile.addNodes(sClass);

  return { declareFile, scriptFile };
}

/**
 * Generate a record interface
 * @param record
 * @returns
 */
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

/**
 * Generate client class
 * @param aliasName
 * @param serviceName
 * @param methods
 * @returns
 */
function generateClient(aliasName: string, schema: ServiceSchema) {
  const className = clientClassName(aliasName);
  const serviceName = schema.serviceName;

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

  function addProp(
    name: string,
    type: TypeNode,
    factory: CallFunctionNode,
    comments?: string[]
  ) {
    const dprop = new VariableNode(`readonly ${name}`, type);
    if (comments) dprop.comments.push(...comments);

    const sprop = new AssignmentNode(new VariableNode(`this.${name}`), factory);

    dNode.addProperty(new ClassPropertyNode(dprop));
    sNode.constructorFn.blocks.push(sprop);
  }

  // Properties
  // Generate methods
  Object.entries(schema.methods).forEach(([name, config]) => {
    addProp(
      `${name}Method`,
      new TypeNode('ExtractClientMethod', [
        new TypeNode(config.request),
        new TypeNode(config.response),
      ]),
      new CallFunctionNode('this.createMethod', new ValueNode(name, true)),
      [
        '@method',
        config.description,
        config.deprecated && '@deprecated',
      ].filter((c) => !!c)
    );
  });

  // Generate commands
  Object.entries(schema.commands).forEach(([name, config]) => {
    // Command
    addProp(
      `${name}Command`,
      new TypeNode('ExtractCommandMessage', [new TypeNode(config.request)]),
      new CallFunctionNode(
        'this.createCommandMessage',
        new ValueNode(name, true)
      ),
      [
        '@command',
        config.description,
        config.deprecated && '@deprecated',
      ].filter((c) => !!c)
    );

    // Command callback
    addProp(
      `${name}CommandCallback`,
      new TypeNode('ExtractCommandCallback', [new TypeNode(config.request)]),
      new CallFunctionNode(
        'this.createCommandCallback',
        new ValueNode(name, true)
      ),
      [
        '@commandCallback',
        config.description,
        config.deprecated && '@deprecated',
      ].filter((c) => !!c)
    );
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
