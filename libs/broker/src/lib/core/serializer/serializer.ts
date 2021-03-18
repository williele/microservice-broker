import { UsableRecord } from '../interface';
import { NamedRecordType, validateNamedRecord } from '../schema';
import { getRecordData } from '../schema/decorators';
import { verifyName } from '../utils';

export abstract class BaseSerializer {
  abstract readonly serializerName: string;

  /** type schema cacher */
  private readonly types: Record<string, NamedRecordType> = {};
  /** type definition cacher */
  private readonly records: Record<string, unknown> = {};

  getTypes() {
    return this.types;
  }

  /**
   * Insert (add or not if already exists)
   * return record name
   * @param type
   */
  record(type: UsableRecord): string {
    // As pointer to record store
    if (typeof type === 'string') {
      // Record input is string, cannot add definition
      if (this.records[type]) return type;
      else throw new Error(`Record '${type}' is not exists`);
    }

    // As decorator
    else if (getRecordData(type)) {
      const def = getRecordData(type);
      const record = this.records[def.name];
      if (record) {
        // Check if two defs is one
        if (record !== type)
          throw new Error(`Record '${def.name}' definition is duplicated`);
        return def.name;
      } else {
        if (!verifyName(def.name))
          throw new Error(`Record name '${def.name}' is invalid`);

        this.records[def.name] = type;
        this.types[def.name] = def;
        return def.name;
      }
    }

    // As schema definition
    else {
      if (!validateNamedRecord(type))
        throw new Error(`Invalid record definition`);
      if (this.records[type.name])
        throw new Error(`Record '${type.name}' definition is duplicated`);
      if (!verifyName(type.name))
        throw new Error(`Record name '${type.name}' is invalid`);

      this.types[type.name] = type as NamedRecordType;
      return type.name;
    }
  }

  /**
   * Check if record is defined
   * @param name
   * @returns
   */
  hasRecord(name: string): boolean {
    return !!this.types[name];
  }

  /**
   * Get record schema
   * @param name
   * @returns
   */
  getRecord(name: string): NamedRecordType {
    if (!this.types[name]) {
      throw new Error(`Type '${name}' not exists`);
    }

    return this.types[name];
  }

  abstract encode<T>(name: string, val: T): Buffer;
  abstract decode<T>(name: string, buffer: Buffer): T;
}
