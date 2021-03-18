const MISSING_REQUIRED_DEPENDENCY = (name: string, reason: string) =>
  `The "${name}" package is missing. Please, make sure to install this library ($ npm install ${name}) to take advantage to ${reason}`;

export function packageLoader(
  packageName: string,
  context: string,
  loaderFn?: CallableFunction
) {
  try {
    return loaderFn ? loaderFn() : require(packageName);
  } catch {
    console.error(MISSING_REQUIRED_DEPENDENCY(packageName, context));
    process.exit(1);
  }
}
