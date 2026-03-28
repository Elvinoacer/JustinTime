export function normalizeKenyanPhone(input: string): string {
  const digits = input.replace(/\D/g, "");

  if (!digits) return "";

  // Accept international prefix variants first.
  if (digits.startsWith("00")) {
    const withoutInternationalPrefix = digits.slice(2);
    if (withoutInternationalPrefix.startsWith("254")) {
      return withoutInternationalPrefix;
    }
  }

  if (digits.startsWith("254")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `254${digits.slice(1)}`;
  }

  if (digits.startsWith("7") || digits.startsWith("1")) {
    return `254${digits}`;
  }

  return digits;
}

export function isValidKenyanPhone(phone: string): boolean {
  return /^254(?:7\d{8}|1\d{8})$/.test(phone);
}
