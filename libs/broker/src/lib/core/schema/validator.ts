import { SchemaError } from '../error';
import { verifyName } from '../utils/verify-name';
import { RecordType, SchemaType } from './interface';
import { RecordStorage } from './record-storage';

// Unname record
export function verifyRecord(
  storage: RecordStorage,
  path: string,
  schema: RecordType,
  hasName = false
) {
  if (typeof schema !== 'object') {
    throw new SchemaError(`Invalid record schema`);
  }

  const name = schema['name'];
  if (hasName && !verifyName(name)) {
    throw new SchemaError(`'${name}' name is not valid`);
  }

  // Verify each field
  if (!schema['fields'] || typeof schema['fields'] !== 'object') {
    throw new SchemaError(`'${name}' fields is invalid`);
  }

  // Verify field name and order
  // Make sure order is not duplicate
  const fields = Object.entries(schema['fields']);
  const orders: Record<number, string> = {};
  for (const [name, def] of fields) {
    // Name
    if (!verifyName(name)) {
      throw new SchemaError(`'${path}' field '${name}' name is not valid`);
    }

    const fPath = `${path}.${name}`;
    // Order
    if (!def.order) {
      throw new SchemaError(`'${fPath}' order is missing`);
    }
    if (def.order < 0 || !Number.isInteger(def.order)) {
      throw new SchemaError(`'${fPath}' order '${def.order}' is invalid`);
    }
    if (orders[def.order]) {
      throw new SchemaError(
        `'${fPath}' order '${def.order}' is duplicate. Already define on '${
          orders[def.order]
        }'`
      );
    }
    orders[def.order] = fPath;

    // Fields
    verifySchema(storage, fPath, def);
  }
}

export function verifySchema(
  storage: RecordStorage,
  path: string,
  schema: SchemaType
) {
  const s = typeof schema === 'string' ? { type: schema } : schema;

  switch (s.type) {
    case 'record':
      verifyRecord(storage, path, s, false);
      break;

    case 'pointer':
      if (!storage.has(s.pointer)) {
        throw new SchemaError(`'${path}' pointer not exists`);
      }
      break;

    case 'array':
      verifySchema(storage, `${path}.items`, s.items);
      break;

    case 'union':
      s.union.forEach((t, i) =>
        verifySchema(storage, `${path}.union[${i}]`, t)
      );
      break;

    case 'map':
      verifySchema(storage, `${path}.values`, s.values);
      break;

    default:
      break;
  }
}
