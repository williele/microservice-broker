import { SchemaError } from '../error';
import { verifyName } from '../utils/verify-name';
import { getRecordData } from './decorators';
import { NamedRecordType, RecordDefinition } from './interface';
import { verifyNamedRecord } from './validator';

/**
 * Storage of records
 */
export class RecordStorage {
  private readonly records: Record<string, NamedRecordType> = {};
  private readonly recordClasses: Record<string, unknown> = {};

  constructor(records: RecordDefinition[]) {
    // Default records
    records.forEach((record) => this.add(record));
  }

  /**
   * Get a record by name
   * throw error if record not exists
   * @param name
   */
  get(name: string) {
    if (this.records[name]) return this.records[name];
    throw new SchemaError(`Record '${name}' not exists`);
  }

  /**
   * Add new record
   * @param definition
   * @returns
   */
  add(definition: RecordDefinition) {
    // As pointer to record store
    if (typeof definition === 'string') {
      // Record input is string, cannot add definition
      if (this.records[definition]) return definition;
      else throw new SchemaError(`Record '${definition}' is not exists`);
    }

    // As decorator
    else if (typeof definition === 'function') {
      const def = getRecordData(definition);
      if (!def) throw new SchemaError(`'${definition}' is not a record`);
      verifyNamedRecord(def);

      const record = this.recordClasses[def.name];
      if (record) {
        // Check if two defs is one
        if (record !== definition) {
          throw new SchemaError(
            `Record '${def.name}' definition is duplicated`
          );
        }
        return def.name;
      } else {
        if (!verifyName(def.name)) {
          throw new SchemaError(`Record name '${def.name}' is invalid`);
        }

        this.recordClasses[def.name] = definition;
        this.records[def.name] = def;
        return def.name;
      }
    }

    // As schema definition
    else {
      verifyNamedRecord(definition);
      if (this.records[definition.name]) {
        throw new SchemaError(
          `Record '${definition.name}' definition is duplicated`
        );
      } else if (!verifyName(definition.name)) {
        throw new SchemaError(`Record name '${definition.name}' is invalid`);
      }

      this.records[definition.name] = definition as NamedRecordType;
      return definition.name;
    }
  }
}
