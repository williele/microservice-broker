import {
  BadRequestError,
  BrokerError,
  BrokerErrorCode,
  clientCauseErrors,
} from '../error';
import {
  CallbackMessage,
  MessageCallback,
  MessagePacket,
  TransportPacket,
} from '../interface';
import { BaseSerializer } from '../serializer';
import { BaseTransporter } from '../transporter';
import { injectHeader } from './header';
import { subjectRpc } from './subject-name';

export async function sendRequest(
  transporter: BaseTransporter,
  subject: string,
  packet: TransportPacket
) {
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
}

export async function sendMessage(
  from: {
    service: string;
    transporter: BaseTransporter;
    serializer: BaseSerializer;
  },
  target: {
    type: string;
    name: string;
  },
  message: {
    packet: MessagePacket;
    request: string;
  },
  callback?: MessageCallback
) {
  const { destination, header, payload } = message.packet;
  const [type, name] = message.packet.request.split(':');

  if (type !== target.type || name !== target.name) {
    throw new BadRequestError(`Message request and definition not match`);
  }

  // Inject header
  injectHeader(from.service, type, name, header);

  const callbackHandle = async (error?) => {
    if (!callback) return;

    const callbackMsg: CallbackMessage = Object.create(message);
    // Decode payload
    callbackMsg.payload = from.serializer.decode(message.request, payload);

    await callback(callbackMsg, error);
  };

  try {
    const subject = subjectRpc(destination);
    await sendRequest(from.transporter, subject, { header, body: payload });
    await callbackHandle();
  } catch (err) {
    // Ignore if error is duplicate
    if (err instanceof BrokerError && clientCauseErrors.includes(err.code)) {
      // Callback handling
      await callbackHandle(err);
    } else {
      throw err;
    }
  }
}
