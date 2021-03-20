import { Span, Tags } from 'opentracing';
import { UsableRecord } from '../interface';
import { NamedRecordType, validateNamedRecord } from '../schema';
import { getRecordData } from '../schema/decorators';
import { verifyName } from '../utils/verify-name';
import { NullRecord, ServiceSchemaRecord } from './default';

const defaultNames: string[] = [NullRecord.name, ServiceSchemaRecord.name];

export abstract class BaseSerializer {
  abstract readonly serializerName: string;

  /** type schema cacher */
  private readonly types: Record<string, NamedRecordType> = {
    [NullRecord.name]: NullRecord,
    [ServiceSchemaRecord.name]: ServiceSchemaRecord,
  };
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
      if (this.types[type]) return type;
      else if (defaultNames.includes(type)) return type;
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

      if (defaultNames.includes(type.name)) return type.name;
      else if (this.records[type.name])
        throw new Error(`Record '${type.name}' definition is duplicated`);
      else if (!verifyName(type.name))
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

  encodeFor<T>(context: string, name: string, val: T, span?: Span): Buffer {
    if (span) span.setTag('schema.type', name);

    try {
      const result = this.encode(name, val);
      if (span) {
        span.log({ event: 'success', length: result.length });
        span.finish();
      }

      return result;
    } catch (err) {
      if (span) {
        span.setTag(Tags.ERROR, true);
        span.log({ event: 'error', 'error.kind': err.message });
        span.finish();
      }

      throw new Error(`Failed to encode '${name}' for '${context}'`);
    }
  }

  decodeFor<T>(context: string, name: string, buffer: Buffer, span?: Span): T {
    if (span) span.setTag('schema.type', name);

    try {
      const result = this.decode<T>(name, buffer);
      if (span) span.finish();

      return result;
    } catch (err) {
      if (span) {
        span.setTag(Tags.ERROR, true);
        span.log({ event: 'error', 'error.kind': err.message });
        span.finish();
      }

      throw new Error(`Failed to decode '${name}' for '${context}'`);
    }
  }

  abstract encode<T>(name: string, val: T): Buffer;
  abstract decode<T>(name: string, buffer: Buffer): T;
}
