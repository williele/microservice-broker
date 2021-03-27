import { SchemaError } from '../error';
import { verifyName } from '../utils/verify-name';
import { NamedRecordType } from './interface';

export function verifyNamedRecord(schema: NamedRecordType) {
  // Verify each field types
  if (typeof schema !== 'object') {
    throw new SchemaError(`Invalid record schema`);
  }

  // Verify name
  const name = schema['name'];
  if (!verifyName(name)) {
    throw new SchemaError(`Record name '${name}' is not valid`);
  }

  // Verify each field
  if (!schema['fields'] || typeof schema['fields'] !== 'object') {
    throw new SchemaError(`Record '${name}' fields is invalid`);
  }

  // Verify field name and order
  // Make sure order is not duplicate
  const fields = Object.entries(schema['fields']);
  const orders: Record<number, string> = {};
  for (const [name, config] of fields) {
    // Name
    if (!verifyName(name)) {
      throw new SchemaError(
        `Record '${name}' field '${name}' name is not valid`
      );
    }

    // Order
    if (orders[config.order]) {
      throw new SchemaError(
        `Record '${name}' field '${name}' order '${
          config.order
        }' is duplicate. Already define on '${orders[config.order]}'`
      );
    }

    orders[config.order] = name;
  }
}
