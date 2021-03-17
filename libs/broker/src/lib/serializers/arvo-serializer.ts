import { BaseSerializer, SchemaType } from '../core';
import { types, Type, Schema } from 'avsc';

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
 * ArvoSerializer dependencies
 * - avsc
 */
export class ArvoSerializer extends BaseSerializer {
  serializerName = 'arvo';

  private cache: Record<string, Type> = {};
  private cacheSchema: Record<string, Schema> = {};

  private getCache(name: string): Type {
    if (this.cache[name]) return this.cache[name];
    else {
      const schema = this.getRecord(name);

      // Create Type and validator
      const transformed = this.schemaTransform(schema);
      const arvo = Type.forSchema(transformed, {
        logicalTypes: {
          // Custom logical name
          [TimestampType.logicalName]: TimestampType,
        },
      });

      // Cache
      this.cache[name] = arvo;
      return this.cache[name];
    }
  }

  encode<T>(name: string, val: T): Buffer {
    const arvo = this.getCache(name);
    return arvo.toBuffer(val);
  }

  decode<T>(name: string, buffer: Buffer): T {
    const arvo = this.getCache(name);
    return arvo.fromBuffer(buffer) as T;
  }

  /**
   * Transform schema type to arvo schema and fv schema
   */
  schemaTransform(schema: SchemaType, name?: string): Schema {
    let arvo: Schema = { type: 'null' };

    const sc: SchemaType =
      typeof schema === 'string' ? { type: schema } : schema;
    // null
    if (sc.type === 'null') {
      arvo.type = 'null';
    }
    // boolean
    else if (sc.type === 'boolean') {
      arvo.type = 'boolean';
    }
    // number
    else if (
      sc.type === 'int' ||
      sc.type === 'long' ||
      sc.type === 'float' ||
      sc.type === 'double'
    ) {
      arvo.type = sc.type;
    }
    // timestamp
    else if (sc.type === 'timestamp') {
      arvo = { type: 'long', logicalType: TimestampType.logicalName };
    }
    // bytes
    else if (sc.type === 'bytes') {
      arvo.type = 'bytes';
    }
    // string
    else if (sc.type === 'string') {
      arvo.type = 'string';
    }
    // record
    else if (sc.type === 'record') {
      const fields = Object.entries(sc.fields)
        .sort((a, b) => a[1].order - b[1].order)
        .map(([name, def]) => {
          const result = this.schemaTransform(def, name);
          return { name, type: result };
        });

      arvo = {
        type: 'record',
        name,
        fields,
      };
    }
    // enum
    else if (sc.type === 'enum') {
      arvo = {
        type: 'enum',
        symbols: sc.symbols,
        name,
      };
    }
    // array
    else if (sc.type === 'array') {
      const items = this.schemaTransform(sc.items, undefined);

      arvo = {
        type: 'array',
        name,
        items: items,
      };
    }
    // union
    else if (sc.type === 'union') {
      const types = sc.union.map((t) => this.schemaTransform(t, undefined));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return types as any;
    }
    // map
    else if (sc.type === 'map') {
      const values = this.schemaTransform(sc.values);

      arvo = {
        type: 'map',
        values: values,
      };
    }
    // pointer
    else if (sc.type === 'pointer') {
      // Check cacheSchema
      const cache = this.cacheSchema[sc.pointer];
      if (cache) {
        // User cache
        arvo = cache;
      } else {
        if (!this.hasRecord(sc.pointer)) {
          throw new Error(`Failed to get pointer type '${sc.pointer}'`);
        }

        const schema = this.getRecord(sc.pointer);
        const type = this.schemaTransform(schema, undefined);

        // save to cache
        this.cacheSchema[sc.pointer] = type;

        arvo = type;
      }
    }
    // unknown type
    else {
      throw new Error(`Uknown type`);
    }

    // nullable
    if (sc.nullable) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      arvo = [{ type: 'null' }, arvo] as any;
    }

    return arvo;
  }
}
