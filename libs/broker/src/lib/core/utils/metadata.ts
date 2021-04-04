import { BadResponseError } from '../error';
import { ServiceSchema } from '../server';
import { BaseTransporter } from '../transporter';
import { subjectRpc } from './subject-name';

/**
 * Metadata ultilities processing
 * Such as:
 *  - fetch schema
 */
export async function fetchSchema(
  service: string,
  transporter: BaseTransporter
): Promise<ServiceSchema> {
  const header = {
    type: 'metadata',
    name: 'schema',
  };
  const body = Buffer.from([]);

  const response = await transporter.sendRequest(subjectRpc(service), {
    header,
    body,
  });
  if (!(response.body instanceof Buffer)) {
    throw new BadResponseError(`Fetch schema response body is not valid`);
  }

  return JSON.parse(response.body.toString());
}
