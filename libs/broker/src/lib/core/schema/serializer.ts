import { SerializerConfig } from '../interface';
import { NamedSchemaType } from './interface';

export abstract class SerializerAdaptor {
  private types: Record<string, NamedSchemaType> = {};

  protected readonly validate;

  constructor(config: SerializerConfig) {
    this.validate = config.validate || true;
  }

  addType(schema: NamedSchemaType) {
    if (this.types[schema.name]) {
      throw new Error(`Type '${schema.name}' already define`);
    }

    this.types[schema.name] = schema;
  }

  hasType(name: string): boolean {
    return !!this.types[name];
  }

  getType(name: string): NamedSchemaType {
    if (this.types[name]) {
      throw new Error(`Type '${name}' not exists`);
    }

    return this.types[name];
  }

  abstract encode<T>(name: string, val: T): Buffer;
  abstract decode<T>(name: string, buffer: Buffer): T;
}
