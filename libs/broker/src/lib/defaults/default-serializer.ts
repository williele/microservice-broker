import { Serializer } from '../core/schema/serializer';
import { types, Type, Schema } from 'avsc';
import * as FValidator from 'fastest-validator';
import { SchemaType } from '../core/schema/interface';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const va = new (FValidator as any)();

const builtInFormats = ['email', 'uuid', 'objectId', 'luhn', 'mac', 'url'];

// Custom arvo timestamp logical type
class TimestampType extends types.LogicalType {
  static logicalName = 'timestamp';

  _fromValue(val) {
    return new Date(val);
  }
  _toValue(date) {
    return date instanceof Date ? +date : undefined;
  }
  _resolve(type) {
    if (Type.isType(type, 'long', 'string', 'logical:timestamp')) {
      return this._fromValue;
    }
  }
}

/**
 * Default serializer use Arvo and fastest-validate
 */
export class DefaultSerializer extends Serializer {
  private cache: Record<string, { arvo: Type; fv: CallableFunction }> = {};
  private cacheSchema: Record<string, { arvo: Schema; fv }> = {};

  private getCache(name: string): { arvo: Type; fv: CallableFunction } {
    if (this.cache[name]) return this.cache[name];
    else {
      const schema = this.getType(name);

      // Create Type and validator
      const transformed = this.schemaTransform(schema);
      const arvo = Type.forSchema(transformed.arvo, {
        logicalTypes: {
          // Custom logical name
          [TimestampType.logicalName]: TimestampType,
        },
      });
      const fv = va.compile(transformed.fv);

      // Cache
      this.cache[name] = { arvo, fv };
      return this.cache[name];
    }
  }

  validate(name: string, val: unknown) {
    const { fv } = this.getCache(name);
    const result = fv(val);
    if (result !== true) throw new Error(result);

    return true;
  }

  encode<T>(name: string, val: T, validate?: boolean): Buffer {
    if (validate ?? this.encodeValidate) this.validate(name, val);

    const { arvo } = this.getCache(name);
    return arvo.toBuffer(val);
  }

  decode<T>(name: string, buffer: Buffer, validate?: boolean): T {
    const { arvo } = this.getCache(name);
    const result = arvo.fromBuffer(buffer);

    if (validate ?? this.decodeValidate) this.validate(name, result);
    return result as T;
  }

  /**
   * Transform schema type to arvo schema and fv schema
   */
  schemaTransform(
    schema: SchemaType,
    name?: string,
    root = true
  ): { arvo: Schema; fv } {
    let arvo: Schema = { type: 'null' };
    let fv = {};

    const sc: SchemaType =
      typeof schema === 'string' ? { type: schema } : schema;
    // null
    if (sc.type === 'null') {
      arvo.type = 'null';

      fv['type'] = 'equal';
      fv['value'] = null;
      fv['strict'] = true;
    }
    // boolean
    else if (sc.type === 'boolean') {
      arvo.type = 'boolean';

      fv['type'] = 'boolean';
    }
    // number
    else if (
      sc.type === 'int' ||
      sc.type === 'long' ||
      sc.type === 'float' ||
      sc.type === 'double'
    ) {
      arvo.type = sc.type;

      fv['type'] = 'number';
      if (sc.type === 'int' || sc.type === 'long') fv['integer'] = true;
      // Addition validator
      if (sc.min !== undefined) fv['min'] = sc.min;
      if (sc.max !== undefined) fv['max'] = sc.max;
      if (sc.positive !== undefined) fv['positive'] = sc.positive;
      if (sc.negative !== undefined) fv['negative'] = sc.negative;
    }
    // timestamp
    else if (sc.type === 'timestamp') {
      arvo = { type: 'long', logicalType: TimestampType.logicalName };

      fv['type'] = 'date';
    }
    // bytes
    else if (sc.type === 'bytes') {
      arvo.type = 'bytes';

      fv['type'] = 'class';
      fv['instanceOf'] = Buffer;
    }
    // string
    else if (sc.type === 'string') {
      arvo.type = 'string';

      // validate
      // built-in format
      if (builtInFormats.includes(sc.format)) fv['type'] = sc.format;
      else fv['type'] = 'string';
      // addition format
      if (sc.format === 'alpha') fv['alpha'] = true;
      if (sc.format === 'numeric') fv['numeric'] = true;
      if (sc.format === 'alphanum') fv['alphanum'] = true;
      if (sc.format === 'alphadash') fv['alphadash'] = true;
      if (sc.format === 'hex') fv['hex'] = true;
      if (sc.format === 'singleLine') fv['singleLine'] = true;
      if (sc.format === 'base64') fv['base64'] = true;

      if (sc.min !== undefined) fv['min'] = sc.min;
      if (sc.max !== undefined) fv['max'] = sc.min;
      if (sc.length !== undefined) fv['length'] = sc.length;
      if (sc.pattern !== undefined) fv['pattern'] = sc.pattern;
      if (sc.contains !== undefined) fv['contains'] = sc.contains;

      // modify
      if (sc.trim === 'both') fv['trim'] = true;
      if (sc.trim === 'left') fv['trimLeft'] = true;
      if (sc.trim === 'right') fv['trimRight'] = true;
      if (sc.caseTransform === 'lowercase') fv['lowercase'] = true;
      if (sc.caseTransform === 'uppercase') fv['uppercase'] = true;
    }
    // record
    else if (sc.type === 'record') {
      const fields = Object.entries(sc.fields).map(([name, def]) => {
        const result = this.schemaTransform(def, name, false);
        return {
          arvo: { name, type: result.arvo },
          fv: { name, type: result.fv },
        };
      });

      arvo = {
        type: 'record',
        name,
        fields: fields.map((r) => r.arvo),
      };

      fv['type'] = 'object';
      fv['props'] = fields.reduce(
        (a, b) => ({ ...a, [b.fv.name]: b.fv.type }),
        {}
      );
    }
    // enum
    else if (sc.type === 'enum') {
      arvo = {
        type: 'enum',
        symbols: sc.symbols,
        name,
      };

      fv['type'] = 'enum';
      fv['values'] = sc.symbols;
    }
    // array
    else if (sc.type === 'array') {
      const items = this.schemaTransform(sc.items, undefined, false);

      arvo = {
        type: 'array',
        name,
        items: items.arvo,
      };

      fv['type'] = 'array';
      fv['items'] = items.fv;
    }
    // union
    else if (sc.type === 'union') {
      if (root === true) {
        throw new Error('union type not support on root');
      }

      const types = sc.union.map((t) =>
        this.schemaTransform(t, undefined, false)
      );

      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        arvo: types.map((t) => t.arvo) as any,
        fv: types.map((t) => t.fv),
      };
    }
    // map
    else if (sc.type === 'map') {
      const values = this.schemaTransform(sc.values);

      arvo = {
        type: 'map',
        values: values.arvo,
      };

      // console.warn('map type did not support validate yet');
      fv['type'] = 'any';
    }
    // pointer
    else if (sc.type === 'pointer') {
      // Check cacheSchema
      const cache = this.cacheSchema[sc.pointer];
      if (cache) {
        // User cache
        arvo = cache.arvo;
        fv = cache.fv;
      } else {
        if (!this.hasType(sc.pointer)) {
          throw new Error(`Failed to get pointer type '${sc.pointer}'`);
        }

        const schema = this.getType(sc.pointer);
        const type = this.schemaTransform(schema, undefined, false);

        // save to cache
        this.cacheSchema[sc.pointer] = type;

        arvo = type.arvo;
        fv = type.fv;
      }
    }
    // unknown type
    else {
      throw new Error(`Uknown type`);
    }

    // root
    if (root) {
      fv['$$root'] = true;
    }

    // nullable
    if (sc.nullable) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      arvo = [{ type: 'null' }, arvo] as any;
      fv['nullable'] = true;
    }

    return { arvo, fv };
  }
}
