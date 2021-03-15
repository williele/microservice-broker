export class Context<T = unknown> {
  readonly method?: string;
  readonly action?: string;
  readonly body: T;

  static forMethod<D = unknown>(info: {
    header?: Record<string, string>;
    body: D;
  }): Context<D> {
    return {
      method: info.header['method'],
      body: info.body,
    };
  }
}
