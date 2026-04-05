export function sanitizeForLog(
  value: string | null | undefined,
  max = 220,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const flattened = value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!flattened) {
    return undefined;
  }

  return flattened.length > max ? `${flattened.slice(0, max)}...` : flattened;
}
