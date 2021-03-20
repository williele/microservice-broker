/**
 * Verify if string to valid variable name
 * @param name
 * @returns
 */
export function verifyName(name: string) {
  return name.match(/^[a-zA-Z_$][a-zA-Z_$0-9]*$/) !== null;
}
