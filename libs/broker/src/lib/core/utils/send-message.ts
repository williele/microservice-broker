import {
  BadRequestError,
  BrokerError,
  clientCauseErrors,
  DuplicateError,
} from '../error';
import { CallbackMessage, MessageCallback, MessagePacket } from '../interface';
import { BaseSerializer } from '../serializer';
import { BaseTransporter } from '../transporter';
import { injectHeader } from './header';
import { subjectRpc } from './subject-name';

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
    await from.transporter.sendRequest(subject, { header, body: payload });
    await callbackHandle();
  } catch (err) {
    // Ignore if error is duplicate
    if (err instanceof DuplicateError) return;
    else if (
      err instanceof BrokerError &&
      clientCauseErrors.includes(err.code)
    ) {
      // Callback handling
      await callbackHandle(err);
    } else {
      throw err;
    }
  }
}
