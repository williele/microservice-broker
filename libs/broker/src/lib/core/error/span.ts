import { Span, Tags } from 'opentracing';

/**
 * Utils function for log error in tracer
 */
export function spanLogError(span: Span, error: Error) {
  span.setTag(Tags.ERROR, true);
  span.log({
    event: 'error',
    'error.kind': error.name,
    'error.message': error.message,
  });
}
