export function extendArrayMetadata<T extends Array<unknown>>(
  key: string,
  metadata: T,
  target: CallableFunction
) {
  const previousValue = Reflect.getMetadata(key, target) || [];
  const value = [...previousValue, ...metadata];
  Reflect.defineMetadata(key, value, target);
}

export const reduceArray = (a: unknown[], b: unknown[]) => [...a, ...b];

export const filterEmpty = (v) => !!v;
