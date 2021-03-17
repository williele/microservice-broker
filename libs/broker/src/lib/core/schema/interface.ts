export type PrimitiveType =
  | NullType
  | BooleanType
  | IntType
  | LongType
  | FloatType
  | DoubleType
  | TimestampType
  | BytesType
  | StringType;

export type ComplexType =
  | RecordType
  | EnumType
  | ArrayType
  | MapType
  | UnionType
  | PointerType;

export type SchemaType = PrimitiveType | PrimitiveType['type'] | ComplexType;
export type NamedSchemaType = SchemaType & { name: string };
export type NamedRecordType = RecordType & { name: string };

export interface BaseType {
  name?: string;
  nullable?: boolean;
  description?: string;
  deprecated?: boolean;
}

// Null
export interface NullType extends BaseType {
  type: 'null';
}

// Boolean
export interface BooleanType extends BaseType {
  type: 'boolean';
  default?: boolean;
}

// Number
interface NumberLikeValidate {
  min?: number;
  max?: number;
  positive?: boolean;
  negative?: boolean;
}

interface NumberLikeType extends BaseType, NumberLikeValidate {
  default?: number;
}

export interface IntType extends NumberLikeType {
  type: 'int';
}

export interface LongType extends NumberLikeType {
  type: 'long';
}

export interface FloatType extends NumberLikeType {
  type: 'float';
}

export interface DoubleType extends NumberLikeType {
  type: 'double';
}

// Timestamp
export interface TimestampType extends BaseType {
  type: 'timestamp';
  default?: Date;
}

// Bytes
export interface BytesType extends BaseType {
  type: 'bytes';
  default?: Buffer;
}

// String
interface StringValidator {
  min?: number;
  max?: number;
  length?: number;
  pattern?: string;
  contains?: string;
  format?:
    | 'email'
    | 'uuid'
    | 'objectId'
    | 'cuid'
    | 'luhn'
    | 'mac'
    | 'url'
    | 'alpha'
    | 'numeric'
    | 'alphanum'
    | 'alphadash'
    | 'hex'
    | 'singleLine'
    | 'base64';
}

export interface StringFormat {
  trim?: 'both' | 'left' | 'right';
  caseTransform?: 'lowercase' | 'uppercase';
}

export interface StringType extends BaseType, StringValidator, StringFormat {
  type: 'string';
  default?: string;
}

// Record
export interface RecordType extends BaseType {
  type: 'record';
  fields: {
    [name: string]: SchemaType & { order: number };
  };
  default?: Record<string, unknown>;
}

// Enum
export interface EnumType extends BaseType {
  type: 'enum';
  symbols: string[];
  default?: string;
}

// Array
interface ArrayValidate {
  max?: number;
  min?: number;
  length?: number;
  unique?: boolean;
}

export interface ArrayType<T = unknown> extends BaseType, ArrayValidate {
  type: 'array';
  items: SchemaType;
  default?: T[];
}

// Map
export interface MapType extends BaseType {
  type: 'map';
  values: SchemaType;
  default?: Record<string, unknown>;
}

// Union
export interface UnionType extends BaseType {
  type: 'union';
  union: SchemaType[];
  default?: unknown;
}

// Pointer
export interface PointerType extends BaseType {
  type: 'pointer';
  pointer: string;
}
