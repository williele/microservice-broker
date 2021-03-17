import { BaseType, NamedRecordType, SchemaType } from './interface';

/**
 * Construct record schema by decorators
 */

const metadata = '_record';

export function Record(config?: BaseType) {
  return function (constructor: NewableFunction) {
    constructor[metadata] = {
      name: config?.name || constructor.name,
      type: 'record',
      fields: {},
      ...config,
      ...(constructor[metadata] || {}),
    } as NamedRecordType;
  };
}

export function Field(config: SchemaType & { order: number }) {
  return function (target: unknown, key: string) {
    const medatadata = target.constructor[metadata];
    if (!medatadata)
      target.constructor[metadata] = {
        fields: { [key]: config },
      };
    else
      target.constructor[metadata]['fields'] = {
        ...medatadata.fields,
        [key]: config,
      };
  };
}

export function getRecordData(type): NamedRecordType {
  return type[metadata];
}
