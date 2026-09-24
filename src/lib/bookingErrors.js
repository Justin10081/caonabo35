// Friendly, bilingual messages for errors from the guest booking insert
// (contract §6). Codes come from the DB guard (P0001 + C35_*), the
// no_double_booking exclusion constraint (23P01) and CHECK constraints (23514).

const TEXT = {
  C35_PAST_DATE: [
    'La fecha de entrada ya pasó. Elige hoy o una fecha posterior.',
    'That check-in date has already passed. Please choose today or a later date.'],
  C35_INVALID_STAY: [
    'Las reservas en línea son de 1 a 30 noches y hasta 18 meses de anticipación. Para otras fechas, escríbenos por WhatsApp.',
    'Online bookings are for 1–30 nights, up to 18 months ahead. For other dates, message us on WhatsApp.'],
  C35_UNAVAILABLE: [
    'Lo sentimos, esta habitación no está disponible para esas fechas. Prueba otras fechas u otra habitación.',
    'Sorry, this room isn’t available for those dates. Please try other dates or another room.'],
  C35_CAPACITY: [
    'Esta habitación no admite tantos huéspedes. Reduce el número de huéspedes o escríbenos por WhatsApp.',
    'This room can’t take that many guests. Please reduce the number of guests or message us on WhatsApp.'],
  C35_DUPLICATE: [
    'Ya recibimos esta solicitud hace unos minutos, no hace falta enviarla de nuevo. Te contactaremos pronto.',
    'We already received this request a few minutes ago, no need to send it again. We’ll be in touch soon.'],
  C35_RATE_LIMIT: [
    'Estamos recibiendo muchas solicitudes en este momento. Intenta de nuevo en unos minutos o escríbenos por WhatsApp.',
    'We’re receiving a lot of requests right now. Please try again in a few minutes or message us on WhatsApp.'],
  CHECK: [
    'Por favor revisa tus datos: el nombre puede ser demasiado largo o la foto no es una imagen válida.',
    'Please check your details: the name may be too long or the photo isn’t a valid image.'],
  NETWORK: [
    'No pudimos conectar. Revisa tu conexión a internet e intenta de nuevo.',
    'We couldn’t connect. Please check your internet connection and try again.'],
  GENERIC: [
    'No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos por WhatsApp.',
    'We couldn’t send your request. Please try again or message us on WhatsApp.'],
};

export function bookingErrorKey(error) {
  if (!error) return null;
  const code = String(error.code || '');
  const text = [error.message, error.details, error.hint].filter(Boolean).join(' ');
  const m = text.match(/C35_[A-Z_]+/);
  if (m && TEXT[m[0]]) return m[0];
  if (code === '23P01') return 'C35_UNAVAILABLE';
  if (code === '23514') return 'CHECK';
  if (!code && /fetch|network|load failed|timeout/i.test(text)) return 'NETWORK';
  return 'GENERIC';
}

export function bookingErrorMessage(error, lang) {
  const key = bookingErrorKey(error);
  return key ? TEXT[key][lang === 'en' ? 1 : 0] : '';
}

// Admin create/edit (contract §6): an overlap race is reported by the exclusion constraint.
export const isOverlapError = (error) => String(error?.code || '') === '23P01';
export const ADMIN_OVERLAP_TEXT = [
  'Esas fechas se cruzan con otra reserva de esta habitación.',
  'Those dates overlap another booking for this room.'];
