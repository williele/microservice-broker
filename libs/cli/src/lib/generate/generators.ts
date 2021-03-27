export type ClassAccessor = 'public' | 'private' | 'protected';

export class FileGenerator {
  private readonly nodes: Node[] = [];

  toText() {
    return this.nodes.map((n) => n.lines().join('\n')).join('\n\n');
  }

  addNodes(...nodes: Node[]) {
    this.nodes.push(...nodes);
  }
}

abstract class Node {
  public readonly comments: string[] = [];
  lines(): string[] {
    if (this.comments.length) {
      return ['/**', ...this.comments.map((c) => ` * ${c}`), ' */'];
    }
    return [];
  }
}

export class RawNode extends Node {
  constructor(public readonly text: string) {
    super();
  }
  lines() {
    return this.text.split('\n');
  }
}

export class ImportsNode extends Node {
  readonly imports: Map<string, Set<string>> = new Map();
  isJs = false;

  addImport(pack: string, ...items: string[]) {
    let itemSet = this.imports.get(pack);
    if (!itemSet) {
      itemSet = new Set<string>();
      this.imports.set(pack, itemSet);
    }

    items.forEach((i) => itemSet.add(i));
  }

  lines() {
    const imports: string[] = [];
    if (this.isJs) {
      this.imports.forEach((pack, name) => {
        imports.push(
          `const { ${Array.from(pack).join(', ')} } = require('${name}');`
        );
      });
    } else {
      this.imports.forEach((pack, name) => {
        imports.push(
          `import { ${Array.from(pack).join(', ')} } from '${name}';`
        );
      });
    }

    return imports;
  }
}

// Symbol1
abstract class SymbolNode extends Node {
  value() {
    return this.lines().join('');
  }
}

export class TypeNode extends SymbolNode {
  public readonly generics: SymbolNode[] = [];

  constructor(public text: string) {
    super();
  }
  lines() {
    let type = this.text;
    if (this.generics.length)
      type += `<${this.generics.map((g) => g.value()).join(', ')}>`;

    return [type];
  }
}

// Variable
export class VariableNode extends Node {
  constructor(
    public name: string,
    public type?: TypeNode,
    public optional = false
  ) {
    super();
  }

  lines() {
    const lines = super.lines();

    if (this.type)
      lines.push(
        `${this.name}${this.optional ? '?' : ''}: ${this.type.value()}`
      );
    else lines.push(`${this.name}${this.optional ? '?' : ''}`);
    return lines;
  }
}

// Expression
export abstract class ExpressionNode extends Node {
  value() {
    return this.lines().join('');
  }
}

export class ValueNode extends ExpressionNode {
  constructor(public text: string, public inQuote = false) {
    super();
  }

  lines() {
    if (this.inQuote) return [`'${this.text}'`];
    return [this.text];
  }
}

export class CallFunctionNode extends ExpressionNode {
  public readonly expressions: ExpressionNode[] = [];
  public readonly generics: SymbolNode[] = [];

  constructor(public name: string, ...expressions: ExpressionNode[]) {
    super();
    this.expressions = expressions;
  }

  lines() {
    let call = this.name;
    if (this.generics.length)
      call += `<${this.generics.map((g) => g.value()).join(', ')}>`;
    call += `(${this.expressions.map((e) => e.value()).join(', ')})`;

    return [call];
  }
}

// Assignment
export class AssignmentNode extends Node {
  constructor(
    public variable: VariableNode,
    public expression?: ExpressionNode
  ) {
    super();
  }

  lines() {
    const lines = this.variable.lines();
    const last = lines.length - 1;
    if (this.expression)
      lines[last] = `${lines[last]} = ${this.expression.value()}`;

    return lines;
  }
}

// Define
export abstract class DefineNode extends Node {
  export = false;
  declare = false;
  isJS = false;

  lines() {
    const lines = super.lines();
    let initLine = '';
    if (!this.isJS) {
      if (this.export) initLine += 'export ';
      if (this.declare) initLine += 'declare ';
    }
    lines.push(initLine);

    return lines;
  }
}

export class FunctionNode extends DefineNode {
  readonly arguments: VariableNode[] = [];
  readonly blocks: Node[] = [];

  constructor(public name: string) {
    super();
  }

  lines() {
    const lines = super.lines();
    const last = lines.length - 1;
    let initLine = `${this.name}(${this.arguments
      .map((a) => a.lines().join(''))
      .join(', ')})`;
    if (!this.declare) initLine += ' {';
    lines[last] = initLine;

    this.blocks.forEach((block) => {
      const blockLines = block.lines();
      lines.push(
        ...blockLines.map((l, i) => {
          if (i === blockLines.length - 1) return `  ${l};`;
          return `  ${l}`;
        })
      );
    });

    if (this.declare) {
      lines[lines.length - 1] += ';';
      return lines;
    } else return [...lines, '}'];
  }
}

export class InterfaceNode extends DefineNode {
  private fields: Record<string, VariableNode> = {};

  constructor(public name: string) {
    super();
  }

  addField(variable: VariableNode) {
    this.fields[variable.name] = variable;
  }

  lines() {
    const lines = super.lines();
    const last = lines.length - 1;
    lines[last] = `${lines[last]}interface ${this.name} {`;

    const fields = Object.values(this.fields);
    fields.forEach((field) => {
      const fieldLines = field.lines();
      lines.push(
        ...fieldLines.map((v, i) => {
          if (i === fieldLines.length - 1) return `  ${v};`;
          return `  ${v}`;
        })
      );
    });

    return [...lines, '}'];
  }
}

export class ClassNode extends DefineNode {
  private properties: ClassPropertyNode[] = [];
  public decorators: SymbolNode[] = [];
  public constructorFn: FunctionNode;

  addProperty(...properties: ClassPropertyNode[]) {
    this.properties.push(...properties);
  }

  constructor(public name: string, public extend?: string) {
    super();
  }

  lines() {
    const lines = super.lines();

    // add decorators
    this.decorators.forEach((d) => {
      const de = `@${d.value()}`;
      lines.splice(lines.length - 1, 0, de);
    });

    const last = lines.length - 1;
    lines[last] = `${lines[last]}class ${this.name}${
      this.extend ? ` extends ${this.extend}` : ''
    } {`;
    if (this.isJS && this.export) {
      lines[last] = `exports.${this.name} = ${lines[last]}`;
    }

    // Properties
    this.properties.forEach((props) => {
      const propLines = props.lines();
      lines.push(
        ...propLines.map((p, i) => {
          if (i === propLines.length - 1) return `  ${p};`;
          return `  ${p}`;
        })
      );
      lines.push('');
    });

    // Constructor
    if (this.constructorFn) {
      this.constructorFn.lines().forEach((l) => {
        lines.push(`  ${l}`);
      });
    }

    return [...lines, '}'];
  }
}

export class ClassPropertyNode extends AssignmentNode {
  isJs = false;

  constructor(
    variable: VariableNode,
    expression?: ExpressionNode,
    public accessor: ClassAccessor = 'public'
  ) {
    super(variable, expression);
  }

  lines() {
    const lines = super.lines();
    const last = lines.length - 1;
    if (!this.isJs) lines[last] = `${this.accessor} ${lines[last]}`;

    return lines;
  }
}
