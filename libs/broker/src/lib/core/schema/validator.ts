export function validateNamedRecord(schema): boolean {
  if (typeof schema !== 'object') return false;
  if (schema['type'] !== 'record') return false;
  if (!schema['name']) return false;
  if (!schema['fields']) return false;
  if (typeof schema['fields'] !== 'object') return false;

  return true;
}
