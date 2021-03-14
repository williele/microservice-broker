import { SerializerConfig } from '../interface';
import { NamedSchemaType } from './interface';

export abstract class SerializerAdaptor {
  private readonly types: Record<string, NamedSchemaType> = {};

  protected readonly encodeValidate;
  protected readonly decodeValidate;

  constructor(config: SerializerConfig) {
    this.encodeValidate = config.encodeValidate ?? true;
    this.decodeValidate = config.decodeValidate ?? true;
  }

  addType(schema: NamedSchemaType): string {
    if (this.types[schema.name]) {
      throw new Error(`Type '${schema.name}' already define`);
    }

    this.types[schema.name] = schema;
    return schema.name;
  }

  hasType(name: string): boolean {
    return !!this.types[name];
  }

  getType(name: string): NamedSchemaType {
    if (!this.types[name]) {
      throw new Error(`Type '${name}' not exists`);
    }

    return this.types[name];
  }

  abstract validate(name: string, val: unknown): boolean;

  abstract encode<T>(name: string, val: T, validate?: boolean): Buffer;

  abstract decode<T>(name: string, buffer: Buffer, validate?: boolean): T;
}
