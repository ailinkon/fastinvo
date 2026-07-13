const ZERO_POINTS = [0x30, 0x0660, 0x06F0, 0x0966, 0x09E6, 0x0A66, 0x0AE6, 0x0B66, 0x0BE6, 0x0C66, 0x0CE6, 0x0D66, 0x0E50, 0x0ED0, 0x0F20, 0x1040];

/** Convert any Unicode decimal digits (Bengali, Devanagari, Arabic-Indic, etc.)
 *  to ASCII 0-9, strip all other invalid characters, allow one decimal point. */
export function normalizeNumericInput(raw: string): string {
  const converted = [...raw].map((ch) => {
    const code = ch.codePointAt(0)!;
    for (const zero of ZERO_POINTS) {
      if (code >= zero && code <= zero + 9) return String(code - zero);
    }
    return ch;
  }).join('');
  const cleaned = converted.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

/** Safe parse that never returns NaN. */
export function parseNumericInput(raw: string): number {
  const n = parseFloat(normalizeNumericInput(raw));
  return Number.isFinite(n) ? n : 0;
}
