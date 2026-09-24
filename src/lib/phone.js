// WhatsApp numbers are stored as digits only (country code included), because
// wa.me/<number> breaks on spaces, "+", parentheses or dashes.
export const digitsOnly = (v) => String(v ?? '').replace(/\D/g, '');

// Digits for wa.me. A 10-digit Dominican number (809/829/849) typed without the
// country code gets its "1", otherwise WhatsApp can't find it.
export function waDigits(v) {
  const d = digitsOnly(v);
  return /^(809|829|849)\d{7}$/.test(d) ? '1' + d : d;
}

// Enough digits for a real international number (country code + subscriber).
export const isWaNumber = (v) => { const d = waDigits(v); return d.length >= 8 && d.length <= 15; };

// Display only: NANP (1 + 10 digits) → "+1 (809) 603-3038"; anything else → "+<digits>".
export function formatWa(v) {
  const d = waDigits(v);
  if (!d) return '';
  if (d.length === 11 && d[0] === '1') return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return `+${d}`;
}

// wa.me link for a guest phone, or null when there is no usable number.
export function waLinkFor(phone, text) {
  if (!isWaNumber(phone)) return null;
  return `https://wa.me/${waDigits(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
