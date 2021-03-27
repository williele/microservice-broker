import { SchemaError } from '../error';
import { getRecordData } from './decorators';
import { NamedRecordType, RecordDefinition } from './interface';
import { verifyRecord } from './validator';

/**
 * Storage of records
 */
export class RecordStorage {
  private readonly _records: Record<string, NamedRecordType> = {};
  private readonly _recordClasses: Record<string, unknown> = {};

  get records() {
    return this._records;
  }

  private verified = false;

  constructor(records: RecordDefinition[]) {
    // Default records
    records.forEach((record) => this.add(record));
  }

  /**
   * Check if record name is exists
   * @param name
   * @returns
   */
  has(name: string) {
    return !!this._records[name];
  }

  /**
   * Get a record by name
   * throw error if record not exists
   * @param name
   */
  get(name: string) {
    if (this._records[name]) return this._records[name];
    throw new SchemaError(`Record '${name}' not exists`);
  }

  /**
   * Add new record
   * @param definition
   * @returns
   */
  add(definition: RecordDefinition) {
    if (this.verified) {
      throw new SchemaError(
        `Records storage already verify cannot add new record`
      );
    }

    // As pointer to record store
    if (typeof definition === 'string') {
      // Record input is string, cannot add definition
      if (this._records[definition]) return definition;
      else throw new SchemaError(`Record '${definition}' is not exists`);
    }

    // As decorator
    else if (typeof definition === 'function') {
      const def = getRecordData(definition);
      if (!def) throw new SchemaError(`'${definition}' is not a record`);

      const record = this._recordClasses[def.name];
      if (record) {
        // Check if two defs is one
        if (record !== definition) {
          throw new SchemaError(
            `Record '${def.name}' definition is duplicated`
          );
        }
        return def.name;
      } else {
        this._recordClasses[def.name] = definition;
        this._records[def.name] = def;
        return def.name;
      }
    }

    // As schema definition
    else {
      if (this._records[definition.name]) {
        throw new SchemaError(
          `Record '${definition.name}' definition is duplicated`
        );
      }

      this._records[definition.name] = definition as NamedRecordType;
      return definition.name;
    }
  }

  verify() {
    if (this.verified) return;

    for (const record of Object.values(this._records)) {
      verifyRecord(this, record.name, { type: 'record', ...record }, true);
    }

    this.verified = true;
  }
}
