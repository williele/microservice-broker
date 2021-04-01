export enum BrokerErrorCode {
  // Config
  CONFIG = 'ConfigError',
  // Schema
  SCHEMA = 'SchemaError',
  // Serializer
  SERIALIZER = 'SerializerError',
  // Transport
  TRANSPORTER = 'TransporterError',

  // Handler
  // Case by server
  INTERNAL = 'InternalError',
  REQUEST_TIME_OUT = 'RequestTimeOut',
  BAD_RESPONSE = 'BadResponse',

  // Cause by client
  HANDLER_UNIMPLEMENT = 'HandlerUnimplementError',
  VALIDATE = 'ValidateError',
  BAD_REQUEST = 'BadRequest',
  NOT_FOUND = 'NotFoundError',
  UNAUTHORIZATION = 'AuthorizationError',
  FORBIDDEN = 'ForbiddenError',
  CONFLICT = 'Conflict',
  DUPLICATE = 'Duplicate',
}

export const clientCauseErrors: string[] = [
  BrokerErrorCode.HANDLER_UNIMPLEMENT,
  BrokerErrorCode.VALIDATE,
  BrokerErrorCode.BAD_REQUEST,
  BrokerErrorCode.NOT_FOUND,
  BrokerErrorCode.UNAUTHORIZATION,
  BrokerErrorCode.FORBIDDEN,
  BrokerErrorCode.CONFLICT,
  BrokerErrorCode.DUPLICATE,
];

export class BrokerError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = code;
  }

  static fromCode(code: BrokerErrorCode, message: string) {
    switch (code) {
      case BrokerErrorCode.CONFIG:
        return new ConfigError(message);

      case BrokerErrorCode.SCHEMA:
        return new SchemaError(message);

      case BrokerErrorCode.SERIALIZER:
        return new SerializerError(message);

      case BrokerErrorCode.TRANSPORTER:
        return new TransporterError(message);

      case BrokerErrorCode.INTERNAL:
        return new InternalError(message);
      case BrokerErrorCode.HANDLER_UNIMPLEMENT:
        return new HandlerUnimplementError(message);
      case BrokerErrorCode.REQUEST_TIME_OUT:
        return new RequestTimeOutError(message);
      case BrokerErrorCode.VALIDATE:
        return new ValidateError(message);
      case BrokerErrorCode.BAD_REQUEST:
        return new BadRequestError(message);
      case BrokerErrorCode.BAD_RESPONSE:
        return new BadResponseError(message);
      case BrokerErrorCode.NOT_FOUND:
        return new NotFoundError(message);
      case BrokerErrorCode.UNAUTHORIZATION:
        return new UnauthorizationError(message);
      case BrokerErrorCode.FORBIDDEN:
        return new ForbiddenError(message);
      case BrokerErrorCode.CONFLICT:
        return new ConfigError(message);
      case BrokerErrorCode.DUPLICATE:
        return new DuplicateError(message);

      default:
        return new InternalError('Unknow error');
    }
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

// Transporter
export class TransporterError extends BrokerError {
  constructor(message: string) {
    super(BrokerErrorCode.TRANSPORTER, message);
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

export class RequestTimeOutError extends BrokerError {
  constructor(message: string) {
    super(BrokerErrorCode.REQUEST_TIME_OUT, message);
  }
}

export class ValidateError extends BrokerError {
  constructor(message: string) {
    super(BrokerErrorCode.VALIDATE, message);
  }

  static fields(fields: Record<string, string>) {
    const message = Object.entries(fields)
      .map(([name, constrain]) => `${name}:${constrain}`)
      .join('|');

    return new ValidateError(`f>${message}`);
  }

  static constant(type) {
    return new ValidateError(`c>${type}`);
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

export class NotFoundError extends BrokerError {
  constructor(message: string) {
    super(BrokerErrorCode.NOT_FOUND, message);
  }

  static resource(resource: string, identify: string) {
    return new NotFoundError(`Resource '${resource}' ${identify} not found`);
  }
}

export class UnauthorizationError extends BrokerError {
  constructor(message: string) {
    super(BrokerErrorCode.UNAUTHORIZATION, message);
  }
}

export class ForbiddenError extends BrokerError {
  constructor(message: string) {
    super(BrokerErrorCode.FORBIDDEN, message);
  }
}

export class ConflictError extends BrokerError {
  constructor(message = 'Conflict') {
    super(BrokerErrorCode.CONFLICT, message);
  }
}

/**
 * This error type use when if command request is duplicate
 * And notice by service handler
 * IMPORTANT! This error will ignore by client command method
 */
export class DuplicateError extends BrokerError {
  constructor(message = 'Duplicate') {
    super(BrokerErrorCode.DUPLICATE, message);
  }
}
