import { SchemaError } from '../error';
import { ArrayType, BaseType, NamedRecordType, SchemaType } from './interface';

/**
 * Construct record schema by decorators
 */

const RECORD = '_record';
const FIELDS = '_fields';

export function Record(config?: BaseType) {
  return function (constructor: NewableFunction) {
    const record: NamedRecordType = {
      name: config?.name || constructor.name,
      type: 'record',
      fields: Reflect.getMetadata(FIELDS, constructor) || {},
      ...config,
    };

    Reflect.defineMetadata(RECORD, record, constructor);
  };
}

export function Field(order: number, config: SchemaType | { new (...args) }) {
  return function (target: unknown, key: string) {
    // const medatadata = target.constructor[metadata];
    const fields = Reflect.getMetadata(FIELDS, target.constructor);

    let field: SchemaType & { order: number };
    if (typeof config === 'string') field = { order, type: config };
    else if (typeof config === 'function') {
      const record = getRecordData(config);
      if (!record)
        throw new SchemaError(
          `Unknown ${config} as field. Make sure it used @Record`
        );
      field = { order, type: 'pointer', pointer: record.name };
    } else field = { order, ...config };

    if (!fields)
      Reflect.defineMetadata(FIELDS, { [key]: field }, target.constructor);
    else
      Reflect.defineMetadata(
        FIELDS,
        { ...fields, [key]: field },
        target.constructor
      );
  };
}

export function ArrayField(
  order: number,
  items: SchemaType | { new (...args) },
  config?: Omit<ArrayType, 'type'>
) {
  let item: SchemaType;
  if (typeof items === 'string') item = { type: items };
  else if (typeof items === 'function') {
    const record = getRecordData(items);
    if (!record)
      throw new SchemaError(
        `Unknown ${items} as field. Make sure it used @Record`
      );

    item = { type: 'pointer', pointer: record.name };
  } else item = items;

  return Field(order, { type: 'array', ...(config || {}), items: item });
}

export function getRecordData(target): NamedRecordType {
  return Reflect.getMetadata(RECORD, target);
}
