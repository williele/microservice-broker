export enum BrokerErrorCode {
  // Config
  CONFIG = 'ConfigError',
  // Schema
  SCHEMA = 'SchemaError',
  // Serializer
  SERIALIZER = 'SerializerError',

  // Handler
  INTERNAL = 'InternalError',
  HANDLER_UNIMPLEMENT = 'HandlerUnimplementError',
  VALIDATE = 'ValidateError',
  BAD_REQUEST = 'BadRequest',
  BAD_RESPONSE = 'BadResponse',
}

export class BrokerError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = code;
  }
}

// Config
export class ConfigError extends BrokerError {
  constructor(message: string) {
    super(BrokerErrorCode.CONFIG, message);
  }
}

// Schema
export class SchemaError extends BrokerError {
  constructor(message: string) {
    super(BrokerErrorCode.SCHEMA, message);
  }
}

// Serializer
export class SerializerError extends BrokerError {
  constructor(message: string) {
    super(BrokerErrorCode.SERIALIZER, message);
  }
}

// Handler
export class InternalError extends BrokerError {
  constructor(message: string) {
    super(BrokerErrorCode.INTERNAL, message);
  }
}
export class HandlerUnimplementError extends BrokerError {
  constructor(message: string) {
    super(BrokerErrorCode.HANDLER_UNIMPLEMENT, message);
  }
}
export class ValidateError extends BrokerError {
  constructor(message: string) {
    super(BrokerErrorCode.VALIDATE, message);
  }
}
export class BadRequestError extends BrokerError {
  constructor(message: string) {
    super(BrokerErrorCode.BAD_REQUEST, message);
  }
}
export class BadResponseError extends BrokerError {
  constructor(message: string) {
    super(BrokerErrorCode.VALIDATE, message);
  }
}
