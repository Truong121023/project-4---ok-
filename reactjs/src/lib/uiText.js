export function translateUiText(value) {
  const rawValue = String(value ?? "");

  if (!rawValue.trim()) {
    return rawValue;
  }

  return rawValue;
}
