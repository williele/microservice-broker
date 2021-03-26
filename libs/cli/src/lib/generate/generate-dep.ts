import type { MethodInfo, NamedRecordType } from '@williele/broker';
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
import { toType } from './to-type';

const hideTypes = ['ServiceSchema', 'Null'];

export function generateDependency(dependency: {
  aliasName: string;
  serviceName: string;
  types: Record<string, NamedRecordType>;
  methods: Record<string, MethodInfo>;
}) {
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

  Object.values(dependency.types).forEach((record) => {
    const inter = generateType(record);
    if (!inter) return;

    declareFile.addNodes(inter);
  });

  const [dClass, sClass] = generateClient(
    dependency.aliasName,
    dependency.serviceName,
    dependency.methods
  );

  declareFile.addNodes(dClass);
  scriptFile.addNodes(sClass);

  return { declareFile, scriptFile };
}

function generateType(record: NamedRecordType): InterfaceNode {
  const node = new InterfaceNode(record.name);
  node.export = true;

  // Hidden type
  if (hideTypes.includes(record.name)) return;

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
    if (propName.startsWith('metadata')) return;

    const type = new TypeNode('ExtractClientMethod');
    type.generics.push(
      methodGeneric(config.request),
      methodGeneric(config.response)
    );

    const dProp = new VariableNode(propName, type);
    dProp.comments.push('@method');
    if (config.description) dProp.comments.push(config.description);

    const sProp = new ClassPropertyNode(
      new VariableNode(propName),
      new CallFunctionNode('this.createMethod', new ValueNode(name, true))
    );
    sProp.isJs = true;

    dNode.addProperty(new ClassPropertyNode(dProp));
    sNode.addProperty(sProp);
  });

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
