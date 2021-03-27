import { Span, Tags } from 'opentracing';
import { SerializerError } from '../error';
import { RecordStorage } from '../schema';
import { SerializerConfig } from './interface';

export abstract class BaseSerializer {
  abstract readonly serializerName: string;

  // Config shorcut
  private get tracing() {
    return this.config.tracing ?? false;
  }

  constructor(
    protected readonly config: SerializerConfig,
    public readonly storage: RecordStorage
  ) {}

  encodeFor<T>(context: string, name: string, val: T, span?: Span): Buffer {
    if (this.tracing && span) span.setTag('schema.type', name);

    try {
      const result = this.encode(name, val);
      if (this.tracing && span) {
        span.log({ event: 'success', length: result.length });
        span.finish();
      }

      return result;
    } catch (err) {
      if (this.tracing && span) {
        span.setTag(Tags.ERROR, true);
        span.log({ event: 'error', 'error.kind': err.message });
        span.finish();
      }

      throw new SerializerError(`Failed to encode '${name}' for '${context}'`);
    }
  }

  decodeFor<T>(context: string, name: string, buffer: Buffer, span?: Span): T {
    if (this.tracing && span) span.setTag('schema.type', name);

    try {
      const result = this.decode<T>(name, buffer);
      if (this.tracing && span) span.finish();

      return result;
    } catch (err) {
      if (this.tracing && span) {
        span.setTag(Tags.ERROR, true);
        span.log({ event: 'error', 'error.kind': err.message });
        span.finish();
      }

      throw new SerializerError(`Failed to decode '${name}' for '${context}'`);
    }
  }

  abstract encode<T>(name: string, val: T): Buffer;
  abstract decode<T>(name: string, buffer: Buffer): T;
}
