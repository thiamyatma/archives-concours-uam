export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

const FILE_SIZE_UNITS = ["o", "Ko", "Mo", "Go"] as const;

/** Ex. `formatFileSize(9_437_184)` -> `"9 Mo"`. */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 o";

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    FILE_SIZE_UNITS.length - 1
  );
  const value = bytes / 1024 ** exponent;
  const formatted = exponent === 0 ? String(value) : value.toFixed(1).replace(/\.0$/, "");

  return `${formatted} ${FILE_SIZE_UNITS[exponent]}`;
}
