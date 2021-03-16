import { NamedRecordType } from './schema';

export abstract class BaseSerializer {
  abstract readonly serializerName: string;

  private readonly types: Record<string, NamedRecordType> = {};

  getTypes() {
    return this.types;
  }

  addType(schema: NamedRecordType): string {
    if (this.types[schema.name]) {
      throw new Error(`Record '${schema.name}' already define`);
    }

    this.types[schema.name] = schema;
    return schema.name;
  }

  hasType(name: string): boolean {
    return !!this.types[name];
  }

  getType(name: string): NamedRecordType {
    if (!this.types[name]) {
      throw new Error(`Type '${name}' not exists`);
    }

    return this.types[name];
  }

  abstract encode<T>(name: string, val: T): Buffer;
  abstract decode<T>(name: string, buffer: Buffer): T;
}