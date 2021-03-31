import {
  BadRequestError,
  BadResponseError,
  BrokerError,
  BrokerErrorCode,
} from '../error';
import { BaseSerializer } from '../serializer';
import { BaseTransporter } from '../transporter';
import { Interceptor } from './interface';

/**
 * Serializer before request and after response
 * @param serializer
 * @param request
 * @param response
 * @returns
 */
export function serializeRequest(
  serializer: BaseSerializer,
  request: string,
  response: string
): Interceptor {
  return async (packet, next) => {
    packet['body'] = serializer.encodeFor(
      'method_request',
      request,
      packet['body']
    );

    const result = await next();
    if (!(result['body'] instanceof Buffer)) {
      throw new BadResponseError(`Bad response body. Isn't a Buffer`);
    }
    result['body'] = serializer.decodeFor(
      'method_response',
      response,
      result['body']
    );

    return result;
  };
}

/**
 * Serializer before request
 * @param serializer
 * @param request
 * @returns
 */
export function serializerCommand(
  serializer: BaseSerializer,
  request: string
): Interceptor {
  return async (packet, next) => {
    packet['body'] = serializer.encodeFor(
      'command_request',
      request,
      packet['body']
    );

    return next();
  };
}

/**
 * Send a request use transporter
 * This is for request/response pattern
 * @param subject
 * @param transporter
 * @returns
 */
export function request(
  subject: string,
  transporter: BaseTransporter
): Interceptor {
  return async (packet) => {
    if (!(packet.body instanceof Buffer)) {
      throw new BadRequestError(`Bad request body. Isn't a Buffer`);
    }

    const response = await transporter.sendRequest(subject, {
      body: packet.body,
      header: packet.header,
    });

    const errorCode = response.header['error'];
    if (errorCode) {
      // Is error
      throw BrokerError.fromCode(
        errorCode as BrokerErrorCode,
        response.header['error.message']
      );
    } else {
      return response;
    }
  };
}
