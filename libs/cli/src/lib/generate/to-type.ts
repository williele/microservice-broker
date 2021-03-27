import { SchemaType } from '@williele/broker';

/**
 * Schema type to typescript type
 * @param type
 * @returns
 */
export function toType(type: SchemaType) {
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
