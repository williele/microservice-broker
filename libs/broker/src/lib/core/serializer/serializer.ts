import { Span, Tags } from 'opentracing';
import { SchemaError, SerializerError } from '../error';
import { RecordDefinition } from '../interface';
import { NamedRecordType, verifyNamedRecord } from '../schema';
import { getRecordData } from '../schema/decorators';
import { verifyName } from '../utils/verify-name';
import { NullRecord, ServiceSchemaRecord } from './default';
import { SerializerConfig } from './interface';

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

  // Config shorcut
  private get tracing() {
    return this.config.tracing ?? false;
  }

  constructor(private readonly config: SerializerConfig) {}

  getTypes() {
    return this.types;
  }

  /**
   * Insert (add or not if already exists)
   * return record name
   * @param type
   */
  record(type: RecordDefinition): string {
    // As pointer to record store
    if (typeof type === 'string') {
      // Record input is string, cannot add definition
      if (this.types[type]) return type;
      else if (defaultNames.includes(type)) return type;
      else throw new SerializerError(`Record '${type}' is not exists`);
    }

    // As decorator
    else if (getRecordData(type)) {
      const def = getRecordData(type);
      const record = this.records[def.name];
      if (record) {
        // Check if two defs is one
        if (record !== type)
          throw new SerializerError(
            `Record '${def.name}' definition is duplicated`
          );
        return def.name;
      } else {
        if (!verifyName(def.name))
          throw new SchemaError(`Record name '${def.name}' is invalid`);

        this.records[def.name] = type;
        this.types[def.name] = def;
        return def.name;
      }
    }

    // As schema definition
    else {
      if (!verifyNamedRecord(type))
        throw new SerializerError(`Invalid record definition`);

      if (defaultNames.includes(type.name)) return type.name;
      else if (this.records[type.name])
        throw new SerializerError(
          `Record '${type.name}' definition is duplicated`
        );
      else if (!verifyName(type.name))
        throw new SchemaError(`Record name '${type.name}' is invalid`);

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
      throw new SerializerError(`Type '${name}' not exists`);
    }

    return this.types[name];
  }

  encodeFor<T>(context: string, name: string, val: T, span?: Span): Buffer {
    if (this.tracing && span) span.setTag('schema.type', name);

    try {
      const result = this.encode(name, val);
      if (this.tracing && span) {
        span.log({ event: 'success', length: result.length });
        span.finish();
      }

      return result;
    } catch (err) {
      if (this.tracing && span) {
        span.setTag(Tags.ERROR, true);
        span.log({ event: 'error', 'error.kind': err.message });
        span.finish();
      }

      throw new SerializerError(`Failed to encode '${name}' for '${context}'`);
    }
  }

  decodeFor<T>(context: string, name: string, buffer: Buffer, span?: Span): T {
    if (this.tracing && span) span.setTag('schema.type', name);

    try {
      const result = this.decode<T>(name, buffer);
      if (this.tracing && span) span.finish();

      return result;
    } catch (err) {
      if (this.tracing && span) {
        span.setTag(Tags.ERROR, true);
        span.log({ event: 'error', 'error.kind': err.message });
        span.finish();
      }

      throw new SerializerError(`Failed to decode '${name}' for '${context}'`);
    }
  }

  abstract encode<T>(name: string, val: T): Buffer;
  abstract decode<T>(name: string, buffer: Buffer): T;
}
