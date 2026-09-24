// Anything interpolated into markup written with document.write must go through escapeHtml.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
export const escapeHtml = (v) => String(v ?? '').replace(/[&<>"'`]/g, c => ESC[c]);

// Same shape the bookings.id_photo_url CHECK constraint enforces.
export const SAFE_IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
export const isSafeImageDataUrl = (url) => typeof url === 'string' && SAFE_IMAGE_DATA_URL.test(url);

// Shows an ID photo full-size in a new tab, built with DOM APIs (no markup strings).
export function openImageWindow(url, title = 'ID') {
  if (!isSafeImageDataUrl(url)) return false;
  const w = window.open('', '_blank');
  if (!w) return false;
  const d = w.document;
  d.title = title;
  Object.assign(d.body.style, { margin: '0', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' });
  const img = d.createElement('img');
  img.alt = title;
  img.src = url;
  Object.assign(img.style, { maxWidth: '100%', maxHeight: '100vh', objectFit: 'contain' });
  d.body.appendChild(img);
  return true;
}
