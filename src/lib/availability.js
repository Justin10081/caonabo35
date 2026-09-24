// Night-by-night availability checks shared by the public site and the admin.
// Stays are [checkIn, checkOut): the check-out morning is not a booked night.
import { addDays, isYmd, nightsBetween } from './dates.js';
import { nightRow } from './pricing.js';

export function stayNights(checkIn, checkOut) {
  if (!isYmd(checkIn) || !isYmd(checkOut)) return [];
  const n = Math.min(nightsBetween(checkIn, checkOut), 800);
  const out = [];
  for (let i = 0; i < n; i++) out.push(addDays(checkIn, i));
  return out;
}

// Another non-cancelled booking of the same room overlapping the stay.
export function hasBookingConflict(bookings, roomId, checkIn, checkOut, excludeId = null) {
  return (bookings || []).some(b => {
    if (excludeId != null && b.id === excludeId) return false;
    if (String(b.room) !== String(roomId)) return false;
    if (b.status === 'cancelled') return false;
    return checkIn < b.checkOut && checkOut > b.checkIn;
  });
}

// Nights the admin closed in the per-night grid (room_nights.available = false).
export function blockedNights(roomNights, roomId, checkIn, checkOut) {
  return stayNights(checkIn, checkOut).filter(d => nightRow(roomNights, roomId, d)?.available === false);
}

// Nights imported from Airbnb/Booking.com iCal feeds. blocks: Map `${roomId}|date` → source
// ('airbnb' | 'booking' | 'other'), or a Set of keys (source unknown).
export function channelNights(blocks, roomId, checkIn, checkOut) {
  if (!blocks || !blocks.size) return [];
  return stayNights(checkIn, checkOut)
    .filter(d => blocks.has(`${roomId}|${d}`))
    .map(d => ({ date: d, source: typeof blocks.get === 'function' ? blocks.get(`${roomId}|${d}`) : undefined }));
}

// Booking "source" as stored on bookings → channel_blocks.source of the same channel.
export const CHANNEL_OF_SOURCE = { 'Airbnb': 'airbnb', 'Booking.com': 'booking' };
