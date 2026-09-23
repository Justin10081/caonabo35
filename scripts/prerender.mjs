// Build-time static pages for crawlers and AI answer engines (they don't run JS).
// Runs after `vite build`: turns dist/index.html into /, /en, /habitaciones, /en/rooms (+ 404, sitemap, llms.txt)
// with real content inside #root. React's createRoot replaces that content on load (no hydration).
// Data: live Supabase (anon REST) with scripts/prerender-fallback.json as the fallback, so the build never
// depends on the database being reachable. `--snapshot` refreshes that fallback file from the live DB.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const FALLBACK_FILE = path.join(ROOT, 'scripts', 'prerender-fallback.json');
const ORIGIN = 'https://caonabo35.com';
const OG_IMAGE = { path: '/og/caonabo35-og.jpg', width: 1200, height: 630 };
const HOTEL_IMAGES = ['/img/terrace.jpg', '/img/livingBig.jpg', '/img/lobby.jpg'];

// ── Mirrors of the app's built-in defaults (src/caonabo35.jsx ROOMS_INIT / SETTINGS_INIT).
// The app shows the DB value and falls back to these per field when a column is null; so do we.
const ROOM_DEFAULTS = [
  { id: '1', name: 'Habitación 201', nameEn: 'Room 201', beds: 'Queen', guests: 2, price: 90, discount: 0, size: '30m²', amenities: ['AC', 'Smart TV', 'Rain Shower'], desc: 'Habitación cómoda y elegante con baño privado.', photo: '/img/room201Bed.jpg' },
  { id: '2', name: 'Habitación 202', nameEn: 'Room 202', beds: 'Queen', guests: 2, price: 75, discount: 0, size: '28m²', amenities: ['AC', 'Smart TV', 'Rain Shower'], desc: 'Espacio acogedor con diseño moderno y todas las comodidades.', photo: '/img/room202Bed.jpg' },
  { id: '3', name: 'Habitación 203', nameEn: 'Room 203', beds: 'Queen', guests: 2, price: 90, discount: 0, size: '30m²', amenities: ['AC', 'Smart TV', 'Rain Shower'], desc: 'Amplia y luminosa, perfecta para una estadía relajada.', photo: '/img/room203Bed.jpg' },
  { id: '4', name: 'Habitación 205', nameEn: 'Room 205', beds: 'Double', guests: 2, price: 75, discount: 0, size: '28m²', amenities: ['AC', 'Smart TV'], desc: 'Confortable habitación con acabados de calidad.', photo: '/img/room205Bed.jpg' },
  { id: '5', name: 'Habitación 206', nameEn: 'Room 206', beds: 'Double', guests: 2, price: 75, discount: 0, size: '28m²', amenities: ['AC', 'Smart TV'], desc: 'Diseño refinado con orientación privilegiada.', photo: '/img/room206Bed.jpg' },
  { id: '6', name: 'Habitación 207', nameEn: 'Room 207', beds: 'Double', guests: 2, price: 60, discount: 0, size: '25m²', amenities: ['AC', 'Smart TV'], desc: 'Habitación acogedora a un precio accesible.', photo: '/img/room207Bed.jpg' },
  { id: '7', name: 'Habitación 208', nameEn: 'Room 208', beds: 'Double', guests: 2, price: 60, discount: 0, size: '25m²', amenities: ['AC', 'Smart TV'], desc: 'Ideal para estadías cortas con todas las comodidades esenciales.', photo: '/img/room208Bed.jpg' },
];
const SETTINGS_DEFAULTS = {
  hotel_name: 'Caonabo 35',
  address: 'Av. Caonabo #35, 2do Piso\nSanto Domingo, República Dominicana',
  phone: '+1 (809) 603-3038', whatsapp: '18096033038',
  check_in_time: '3:00 PM', check_out_time: '12:00 PM', instagram: '@caonabo35',
  hero_subtitle: 'Diseño contemporáneo. Hospitalidad dominicana. Siete habitaciones únicas con alma.',
  min_nights: 1,
};
const ROOM_COLS = 'id,name,name_en,beds,guests,size,description,amenities,price_override,discount,available,photos';
// settings.email is deliberately never read: it's a private address and no public contact email has been chosen.
const SETTINGS_COLS = 'hotel_name,address,phone,whatsapp,instagram,check_in_time,check_out_time,min_nights,hero_subtitle';

// Code-level facts the SPA states (AMENITIES + booking modal). Parking and "24/7" are deliberately left out
// until the owner confirms them.
const SPACES = [
  { key: 'terrace', photo: '/img/terrace.jpg', es: ['Terraza', 'Terraza exterior con mobiliario de teca, luces colgantes y vistas abiertas a la ciudad. Perfecta al anochecer.'], en: ['Terrace', 'An outdoor terrace with teak furniture, string lights and open views over the city. Best at dusk.'] },
  { key: 'garden', photo: '/img/plants.jpg', es: ['Jardín interior', 'Vegetación tropical escogida a mano: bambú, ficus y pothos en macetas de cemento artesanal.'], en: ['Indoor garden', 'Hand-picked tropical greenery: bamboo, ficus and pothos in handmade cement planters.'] },
  { key: 'lobby', photo: '/img/lobby.jpg', es: ['Lobby de arte', 'Recepción con arte contemporáneo dominicano, consola de mármol e iluminación arquitectónica.'], en: ['Art lobby', 'A reception area with contemporary Dominican art, a marble console and architectural lighting.'] },
  { key: 'wifi', photo: '/img/corridor.jpg', es: ['WiFi de fibra óptica', 'Conexión de fibra óptica de alta velocidad en todo el edificio.'], en: ['Fiber-optic WiFi', 'High-speed fiber-optic internet throughout the building.'] },
];
const CANCELLATION_HOURS = 48;

const AMENITY_LABELS = {
  'ac': { es: 'aire acondicionado', en: 'air conditioning' },
  'smart tv': { es: 'Smart TV', en: 'Smart TV' },
  'rain shower': { es: 'ducha tipo lluvia', en: 'rain shower' },
  'minibar': { es: 'minibar', en: 'minibar' },
  'wifi': { es: 'WiFi', en: 'WiFi' },
  'jacuzzi': { es: 'jacuzzi', en: 'jacuzzi' },
};
const BED_LABELS = {
  queen: { es: 'Cama queen', en: 'Queen bed' },
  king: { es: 'Cama king', en: 'King bed' },
  double: { es: 'Cama doble', en: 'Double bed' },
  twin: { es: 'Cama twin', en: 'Twin bed' },
  single: { es: 'Cama individual', en: 'Single bed' },
};
// English for the DB's Spanish room descriptions. An edited description with no entry here is simply
// left off the English pages rather than shown in Spanish.
const DESC_EN = {
  'Habitación cómoda y elegante con baño privado.': 'A comfortable, elegant room with a private bathroom.',
  'Espacio acogedor con diseño moderno y todas las comodidades.': 'A cozy room with modern design and every comfort.',
  'Amplia y luminosa, perfecta para una estadía relajada.': 'Spacious and bright, made for an unhurried stay.',
  'Confortable habitación con acabados de calidad.': 'A comfortable room with quality finishes.',
  'Diseño refinado con orientación privilegiada.': 'Refined design with an enviable orientation.',
  'Habitación acogedora a un precio accesible.': 'A cozy room at an accessible price.',
  'Ideal para estadías cortas con todas las comodidades esenciales.': 'Ideal for short stays, with all the essentials.',
};
const HERO_EN = { [SETTINGS_DEFAULTS.hero_subtitle]: 'Contemporary design. Dominican hospitality. Seven distinctive rooms with soul.' };

// ── Data ─────────────────────────────────────────────────────────────
async function supabaseEnv() {
  try {
    const { loadEnv } = await import('vite');
    return loadEnv('production', ROOT, 'VITE_');
  } catch {
    return process.env;
  }
}

async function fetchLive() {
  const env = await supabaseEnv();
  const url = (env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set');
  const get = async (q) => {
    const res = await fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`${q.split('?')[0]}: HTTP ${res.status}`);
    return res.json();
  };
  const ids = ROOM_DEFAULTS.map((r) => r.id).join(',');
  const [rooms, settings] = await Promise.all([
    get(`rooms?select=${ROOM_COLS}&id=in.(${ids})`),
    get(`settings?select=${SETTINGS_COLS}&id=eq.1`),
  ]);
  return { rooms, settings: Array.isArray(settings) ? settings[0] : null };
}

const num = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
const clean = (s) => (typeof s === 'string' ? s.trim() : '');

function buildModel(raw) {
  if (!raw || !Array.isArray(raw.rooms)) throw new Error('rooms missing');
  const s = { ...SETTINGS_DEFAULTS };
  for (const k of Object.keys(SETTINGS_DEFAULTS)) if (raw.settings && raw.settings[k]) s[k] = raw.settings[k];
  const byId = Object.fromEntries(raw.rooms.map((r) => [String(r.id), r]));

  const rooms = ROOM_DEFAULTS.map((d) => {
    const row = byId[d.id] || {};
    const pick = (v, fb) => (v === null || v === undefined ? fb : v);
    const name = clean(pick(row.name, d.name));
    const nameEn = clean(pick(row.name_en, d.nameEn));
    const price = num(pick(row.price_override, d.price));
    const discount = num(pick(row.discount, d.discount));
    const guests = num(pick(row.guests, d.guests));
    const size = clean(pick(row.size, d.size));
    const desc = clean(pick(row.description, d.desc));
    const amenities = (Array.isArray(row.amenities) ? row.amenities : d.amenities).map(clean).filter(Boolean);
    const saved = Array.isArray(row.photos) ? row.photos.filter((p) => p && typeof p.url === 'string' && /^(https:\/\/|\/)/.test(p.url)) : [];
    const photo = saved.length ? saved[0].url : d.photo;
    if (!name || !Number.isFinite(price) || price <= 0 || !Number.isFinite(guests) || guests < 1) throw new Error(`room ${d.id} incomplete`);
    const direct = discount > 0 ? Math.round(price * (1 - discount / 100)) : price; // same formula as the SPA
    const numLabel = (name.match(/\d+/) || [d.id])[0];
    const m2 = Number((size.match(/\d+(?:[.,]\d+)?/) || [''])[0].replace(',', '.'));
    return {
      id: d.id, num: numLabel, anchor: `hab-${numLabel}`,
      name: { es: name, en: nameEn || `Room ${numLabel}` },
      bed: clean(pick(row.beds, d.beds)), guests, size, m2: Number.isFinite(m2) && m2 > 0 ? m2 : null,
      desc: { es: desc, en: DESC_EN[desc] || '' }, amenities, photo, price: direct,
    };
  });
  const anchors = new Set();
  for (const r of rooms) { if (anchors.has(r.anchor)) r.anchor += `-${r.id}`; anchors.add(r.anchor); }

  const phoneDigits = String(s.phone).replace(/\D/g, '');
  const waDigits = String(s.whatsapp).replace(/\D/g, '');
  const addressLines = String(s.address).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const handle = String(s.instagram).trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/+$/, '');
  if (!waDigits || !addressLines.length) throw new Error('settings incomplete');
  const prices = rooms.map((r) => r.price);
  return {
    hotel: {
      name: clean(s.hotel_name) || 'Caonabo 35',
      addressLines, street: addressLines[0],
      phone: clean(s.phone), phoneE164: phoneDigits ? `+${phoneDigits.length === 10 ? '1' + phoneDigits : phoneDigits}` : '',
      whatsapp: waDigits,
      instagram: handle ? `@${handle}` : '', instagramUrl: handle ? `https://www.instagram.com/${handle}/` : '',
      checkIn: clean(s.check_in_time), checkOut: clean(s.check_out_time),
      checkInISO: to24h(s.check_in_time), checkOutISO: to24h(s.check_out_time),
      minNights: Number(s.min_nights) || 1,
      heroSubtitle: { es: clean(s.hero_subtitle), en: HERO_EN[clean(s.hero_subtitle)] || '' },
    },
    rooms,
    minPrice: Math.min(...prices), maxPrice: Math.max(...prices),
  };
}

function to24h(v) {
  const m = String(v || '').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?$/i) || String(v || '').trim().match(/^(\d{1,2}):(\d{2})()$/);
  if (!m) return '';
  let h = Number(m[1]); const min = m[2] || '00'; const ap = (m[3] || '').toLowerCase();
  if (ap === 'p' && h < 12) h += 12;
  if (ap === 'a' && h === 12) h = 0;
  return h < 24 ? `${String(h).padStart(2, '0')}:${min}` : '';
}

// ── Text helpers ─────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (u) => (u.startsWith('/') ? ORIGIN + u : u);
const usd = (n) => `US$${n}`;
const join = (items, L) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${L === 'es' ? 'y' : 'and'} ${items[items.length - 1]}`);
const amenityLabel = (a, L) => (AMENITY_LABELS[a.toLowerCase()] || { es: a, en: a })[L];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const bedLabel = (b, L) => (BED_LABELS[b.toLowerCase()] || { es: `Cama: ${b}`, en: `Bed: ${b}` })[L];
const guestsLabel = (g, L) => (L === 'es' ? `Hasta ${g} ${g === 1 ? 'huésped' : 'huéspedes'}` : `Up to ${g} ${g === 1 ? 'guest' : 'guests'}`);
const sizeLabel = (r) => (r.m2 ? `${r.m2} m²` : r.size);
const waLink = (m, text) => `https://wa.me/${m.hotel.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
const oneLineAddress = (m) => m.hotel.addressLines.join(', ');

function commonAmenities(m) {
  const lists = m.rooms.map((r) => r.amenities.map((a) => a.toLowerCase()));
  return m.rooms[0].amenities.filter((a) => lists.every((l) => l.includes(a.toLowerCase())));
}
function extraAmenities(m) {
  const common = new Set(commonAmenities(m).map((a) => a.toLowerCase()));
  const extra = new Map();
  for (const r of m.rooms) for (const a of r.amenities) {
    if (common.has(a.toLowerCase())) continue;
    const k = a.toLowerCase();
    if (!extra.has(k)) extra.set(k, { label: a, rooms: [] });
    extra.get(k).rooms.push(r.num);
  }
  return [...extra.values()];
}
const inEveryRoom = (m, L) => [L === 'es' ? 'baño privado' : 'a private bathroom', ...commonAmenities(m).map((a) => amenityLabel(a, L))];
function priceSpan(m, L) {
  if (m.minPrice === m.maxPrice) return L === 'es' ? `${usd(m.minPrice)} la noche` : `${usd(m.minPrice)} a night`;
  return L === 'es' ? `de ${usd(m.minPrice)} a ${usd(m.maxPrice)} la noche` : `from ${usd(m.minPrice)} to ${usd(m.maxPrice)} a night`;
}

// ── Pages ────────────────────────────────────────────────────────────
const ALT = { home: { es: '/', en: '/en' }, rooms: { es: '/habitaciones', en: '/en/rooms' } };
const PAGES = [
  { lang: 'es', page: 'home', file: 'index.html' },
  { lang: 'en', page: 'home', file: 'en.html' },
  { lang: 'es', page: 'rooms', file: 'habitaciones.html' },
  { lang: 'en', page: 'rooms', file: 'en/rooms.html' },
];
const pageUrl = (page, L) => ORIGIN + ALT[page][L];
const other = (L) => (L === 'es' ? 'en' : 'es');

function meta(pg, m) {
  const n = m.rooms.length;
  const every = join(inEveryRoom(m, pg.lang), pg.lang);
  if (pg.lang === 'es') {
    return pg.page === 'home'
      ? { title: 'Caonabo 35 · Hotel boutique en Santo Domingo', description: `Hotel boutique en Santo Domingo, República Dominicana: ${n} habitaciones con ${every}, desde ${usd(m.minPrice)} la noche en reserva directa.` }
      : { title: 'Habitaciones y precios · Caonabo 35, Santo Domingo', description: `Compara las ${n} habitaciones de Caonabo 35: tipo de cama, capacidad, tamaño y tarifa directa desde ${usd(m.minPrice)} la noche. Reserva en línea o por WhatsApp.` };
  }
  return pg.page === 'home'
    ? { title: 'Caonabo 35 · Boutique Hotel in Santo Domingo', description: `Boutique hotel in Santo Domingo, Dominican Republic: ${n} rooms with ${every}, from ${usd(m.minPrice)} a night when you book direct.` }
    : { title: 'Rooms & Rates · Caonabo 35, Santo Domingo', description: `Compare all ${n} rooms at Caonabo 35: bed type, capacity, size and direct rates from ${usd(m.minPrice)} a night. Book online or on WhatsApp.` };
}

function faq(m, L) {
  const h = m.hotel;
  const guests = [...new Set(m.rooms.map((r) => r.guests))];
  const extras = extraAmenities(m);
  const extraText = extras.map((e) => (L === 'es'
    ? `${e.rooms.length > 1 ? 'las habitaciones' : 'la habitación'} ${join(e.rooms, 'es')} ${e.rooms.length > 1 ? 'tienen' : 'tiene'} además ${amenityLabel(e.label, 'es')}`
    : `${e.rooms.length > 1 ? 'Rooms' : 'Room'} ${join(e.rooms, 'en')} also ${e.rooms.length > 1 ? 'have' : 'has'} ${amenityLabel(e.label, 'en') === 'air conditioning' ? '' : 'a '}${amenityLabel(e.label, 'en')}`));
  const every = join(inEveryRoom(m, L), L);
  if (L === 'es') {
    return [
      ['¿A qué hora son el check-in y el check-out?', `El check-in es a partir de las ${h.checkIn} y el check-out, hasta las ${h.checkOut}.`],
      ['¿Cómo puedo reservar?', `Elige tu habitación y tus fechas en caonabo35.com y envía la solicitud; el hotel te confirma la reserva. También puedes reservar por WhatsApp al ${h.phone}.`],
      ['¿Cuánto cuesta una noche?', `La tarifa directa va ${priceSpan(m, 'es')}, según la habitación. Puede variar según la fecha: al elegir tus fechas verás el total, que el hotel confirma con tu reserva.`],
      ['¿Cuántas personas caben por habitación?', guests.length === 1 ? `Todas las habitaciones son para un máximo de ${guests[0]} ${guests[0] === 1 ? 'huésped' : 'huéspedes'}.` : `Entre ${Math.min(...guests)} y ${Math.max(...guests)} huéspedes, según la habitación.`],
      ['¿Qué incluyen las habitaciones?', `Todas tienen ${every}${extraText.length ? `; ${extraText.join('; ')}` : ''}.`],
      ['¿Cuál es la política de cancelación?', `La cancelación es gratuita con ${CANCELLATION_HOURS} horas de anticipación.`],
      ['¿Dónde está el hotel?', `En ${oneLineAddress(m)}.`],
      ['¿Hay una estadía mínima?', h.minNights > 1 ? `Sí, la estadía mínima es de ${h.minNights} noches.` : 'No: puedes reservar desde una sola noche.'],
    ];
  }
  return [
    ['What time are check-in and check-out?', `Check-in is from ${h.checkIn}; check-out is by ${h.checkOut}.`],
    ['How do I book?', `Choose your room and dates at caonabo35.com and send your request; the hotel then confirms your booking. You can also book on WhatsApp at ${h.phone}.`],
    ['How much is a night?', `Direct rates run ${priceSpan(m, 'en')}, depending on the room. Rates can vary by date: once you pick your dates you'll see the total, which the hotel confirms with your booking.`],
    ['How many guests can stay in a room?', guests.length === 1 ? `Every room sleeps up to ${guests[0]} ${guests[0] === 1 ? 'guest' : 'guests'}.` : `Between ${Math.min(...guests)} and ${Math.max(...guests)} guests, depending on the room.`],
    ['What do the rooms include?', `Every room has ${every}.${extraText.length ? ` ${extraText.join('. ')}.` : ''}`],
    ['What is the cancellation policy?', `Cancellation is free with ${CANCELLATION_HOURS} hours' notice.`],
    ['Where is the hotel?', `At ${oneLineAddress(m)}.`],
    ['Is there a minimum stay?', h.minNights > 1 ? `Yes, the minimum stay is ${h.minNights} nights.` : 'No, you can book a single night.'],
  ];
}

// ── HTML ─────────────────────────────────────────────────────────────
const STATIC_CSS = `.c35s{--iv:#F7F3EE;--pa:#EDE6D9;--sa:#D4C5B0;--ta:#B8A898;--ma:#5C3D2E;--eb:#2A1F16;--go:#C4973A;--gl:#E8C97A;--se:"Cormorant Garamond",Georgia,"Times New Roman",serif;background:var(--iv);color:var(--eb);font:400 1rem/1.65 Lato,system-ui,-apple-system,"Segoe UI",sans-serif;min-height:100vh;margin:0}
body:has(.c35s){margin:0}
.c35s *,.c35s *:before,.c35s *:after{box-sizing:border-box}
.c35s h1,.c35s h2,.c35s h3,.c35s p,.c35s ul,.c35s ol,.c35s dl,.c35s dd,.c35s figure{margin:0;padding:0}
.c35s h1,.c35s h2,.c35s h3{font-family:var(--se);font-weight:400;line-height:1.15}
.c35s ul,.c35s ol{list-style:none}
.c35s img{display:block;max-width:100%;height:auto}
.c35s a{color:inherit}
.c35s a:focus-visible{outline:2px solid var(--go);outline-offset:3px}
.c35s .bar{background:var(--eb);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem 1.5rem;padding:.85rem clamp(1rem,4vw,2.5rem);position:sticky;top:0;z-index:5}
.c35s .logo{display:inline-flex;flex-direction:column;text-decoration:none;font-family:var(--se);color:var(--go);font-size:1.35rem;font-weight:600;letter-spacing:.12em;line-height:1.15}
.c35s .logo small{font-family:Lato,sans-serif;color:var(--ta);font-size:.55rem;font-weight:400;letter-spacing:.25em;text-transform:uppercase}
.c35s .bar ul{display:flex;flex-wrap:wrap;gap:.4rem 1.6rem}
.c35s .bar ul a{color:var(--sa);text-decoration:none;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase}
.c35s .bar ul a:hover{color:var(--gl)}
.c35s .hero{position:relative;min-height:calc(100vh - 3.9rem);display:grid;place-items:center;text-align:center;color:var(--iv);background:#1A0F08;overflow:hidden;padding:4rem 1.25rem}
.c35s .hero>img{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover}
.c35s .hero:after{content:"";position:absolute;inset:0;background:linear-gradient(160deg,rgba(26,15,8,.8),rgba(42,31,22,.55) 50%,rgba(26,15,8,.84))}
.c35s .hero>div{position:relative;z-index:1;max-width:48rem}
.c35s .eye{color:var(--go);font-size:.66rem;letter-spacing:.32em;text-transform:uppercase;margin-bottom:.8rem}
.c35s .hero .eye{margin-bottom:1.3rem}
.c35s .hero h1{font-weight:300}
.c35s .hero h1 .n{display:block;font-size:clamp(3.2rem,8vw,6.5rem);letter-spacing:.06em;line-height:.95}
.c35s .hero h1 .n em{color:var(--gl)}
.c35s .hero h1 .k{display:block;font-size:clamp(1.15rem,2.6vw,1.65rem);letter-spacing:.05em;margin-top:.7rem;color:var(--pa)}
.c35s .sub{font-family:var(--se);font-style:italic;color:var(--sa);font-size:clamp(1.02rem,2vw,1.2rem);max-width:32rem;margin:1.1rem auto 2.2rem}
.c35s .btns{display:flex;flex-wrap:wrap;gap:.8rem;justify-content:center}
.c35s .btn{display:inline-block;padding:.82rem 1.9rem;border:1px solid var(--go);font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;text-decoration:none}
.c35s .btn.g{background:var(--go);color:var(--eb)}
.c35s .btn.o{color:var(--go)}
.c35s .sec:not(.dk) .btn.o{color:var(--ma)}
.c35s .facts{display:flex;flex-wrap:wrap;justify-content:center;gap:1.2rem 3.2rem;margin-top:3.2rem}
.c35s .facts div{display:flex;flex-direction:column-reverse;align-items:center}
.c35s .facts dd{color:var(--go);font-family:var(--se);font-size:1.9rem;font-weight:600;line-height:1}
.c35s .facts dt{color:var(--ta);font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;margin-top:.35rem}
.c35s .sec{padding:clamp(3rem,8vw,5.5rem) clamp(1rem,4vw,2rem)}
.c35s .sec.dk{background:var(--eb);color:var(--pa)}
.c35s .sec.pa{background:var(--pa)}
.c35s .wrap{max-width:72rem;margin:0 auto}
.c35s .hd{text-align:center;margin-bottom:2.6rem}
.c35s .hd:after{content:"";display:block;width:44px;height:1px;background:var(--go);margin:1rem auto 0}
.c35s h2{font-size:clamp(1.85rem,3.8vw,2.85rem);font-weight:300;letter-spacing:.03em}
.c35s .lead{max-width:44rem;margin:1rem auto 0;color:var(--ma)}
.c35s .dk .lead{color:var(--sa)}
.c35s .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,19rem),1fr));gap:1.5rem}
.c35s .grid.four{grid-template-columns:repeat(auto-fill,minmax(min(100%,14rem),1fr))}
.c35s .room{background:#fff;border-top:3px solid var(--go);display:flex;flex-direction:column}
.c35s .room img,.c35s .space img,.c35s .detail img{width:100%;aspect-ratio:4/3;object-fit:cover;background:var(--pa)}
.c35s .room .in{display:flex;flex-direction:column;gap:.55rem;flex:1;padding:1.3rem 1.4rem 1.5rem}
.c35s .room h3{font-size:1.45rem;font-weight:500}
.c35s .meta{color:var(--ma);font-size:.78rem;letter-spacing:.05em}
.c35s .desc{color:var(--ma);font-size:.9rem;font-style:italic}
.c35s .tags{display:flex;flex-wrap:wrap;gap:.35rem}
.c35s .tags li{background:#F0EDE8;color:var(--ma);font-size:.7rem;padding:.15rem .7rem;border-radius:1rem}
.c35s .price{color:var(--ma);font-size:.85rem}
.c35s .room .price{margin-top:auto;padding-top:.3rem}
.c35s .price strong{font-family:var(--se);font-size:1.7rem;font-weight:600;color:var(--eb)}
.c35s .more{align-self:flex-start;color:var(--ma);font-size:.7rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;border-bottom:1px solid var(--go);padding-bottom:.1rem}
.c35s .center{text-align:center;margin-top:2.4rem}
.c35s .space h3{font-size:1.3rem;font-weight:500;margin:.8rem 0 .25rem}
.c35s .space p{color:var(--ma);font-size:.88rem}
.c35s .qa{max-width:48rem;margin:0 auto;border-top:1px solid var(--sa)}
.c35s .qa div{padding:1.1rem 0;border-bottom:1px solid var(--sa)}
.c35s .qa dt{font-family:var(--se);font-size:1.3rem;font-weight:600;margin-bottom:.25rem}
.c35s .qa dd{color:var(--ma);font-size:.93rem}
.c35s .contact{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));gap:0 3rem;max-width:56rem;margin:0 auto}
.c35s .contact div{border-bottom:1px solid rgba(139,107,78,.45);padding:1rem 0}
.c35s .contact dt{color:var(--go);font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;margin-bottom:.3rem}
.c35s .contact dd{color:var(--pa)}
.c35s .contact a{text-decoration:none;border-bottom:1px solid rgba(196,151,58,.45)}
.c35s footer{background:#1A0F08;color:var(--ta);text-align:center;padding:2.2rem 1rem;font-size:.8rem}
.c35s footer .logo{align-items:center;margin-bottom:.4rem}
.c35s footer ul{display:flex;justify-content:center;flex-wrap:wrap;gap:.5rem 1.8rem;margin-top:.9rem}
.c35s footer a{color:var(--sa);text-decoration:none}
.c35s .top{padding:clamp(2rem,6vw,3.5rem) clamp(1rem,4vw,2rem) 0}
.c35s .crumbs ol{display:flex;flex-wrap:wrap;gap:.5rem;color:var(--ma);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;margin-bottom:1.1rem}
.c35s .crumbs li+li:before{content:"›";margin-right:.5rem;color:var(--go)}
.c35s .crumbs a{text-decoration:none}
.c35s .top h1{font-size:clamp(2.1rem,5vw,3.4rem);font-weight:300;letter-spacing:.02em}
.c35s .top .lead{margin:1rem 0 0}
.c35s .tbl{overflow-x:auto;background:#fff;border-top:3px solid var(--go);margin:2.2rem 0 .8rem}
.c35s table{border-collapse:collapse;width:100%;min-width:36rem;font-size:.9rem}
.c35s caption{text-align:left;font-family:var(--se);font-size:1.25rem;padding:1rem 1.2rem .3rem}
.c35s th,.c35s td{text-align:left;padding:.75rem 1.2rem;border-bottom:1px solid var(--pa)}
.c35s thead th{color:var(--ma);font-size:.64rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
.c35s tbody th a{text-decoration:none;border-bottom:1px solid var(--go)}
.c35s td.p{font-weight:700;white-space:nowrap}
.c35s .note{color:var(--ma);font-size:.84rem;font-style:italic}
.c35s .detail{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr));gap:1.4rem 2.5rem;align-items:start;padding:2.6rem 0;border-bottom:1px solid var(--sa);scroll-margin-top:5rem}
.c35s .detail h2{font-size:clamp(1.7rem,3vw,2.3rem);font-weight:400;margin-bottom:.5rem}
.c35s .detail .in{display:flex;flex-direction:column;gap:.7rem}
.c35s .detail .btn{align-self:flex-start;margin-top:.4rem}
.c35s .nf{min-height:70vh;display:grid;place-items:center;text-align:center;padding:4rem 1.25rem}
.c35s .nf h1{font-size:clamp(2.2rem,6vw,3.6rem);font-weight:300;margin-bottom:1rem}
.c35s .nf p{color:var(--ma);max-width:34rem;margin:0 auto .6rem}
@media (max-width:600px){.c35s th,.c35s td{padding:.6rem .75rem}.c35s table{min-width:30rem}.c35s .bar ul{gap:.3rem 1.1rem}}
@media (prefers-reduced-motion:no-preference){.c35s .btn{transition:background .18s,color .18s}.c35s .btn.g:hover{background:var(--gl)}.c35s .btn.o:hover{background:var(--go);color:var(--eb)}}`;

const COPY = {
  es: {
    brandSub: 'Santo Domingo · R.D.', rooms: 'Habitaciones', spaces: 'Espacios', faqNav: 'Preguntas', contact: 'Contacto', switchTo: 'English',
    h1k: 'Hotel boutique en Santo Domingo', seeRooms: 'Ver habitaciones y precios', bookWa: 'Reservar por WhatsApp',
    waHello: '¡Hola! Quiero reservar en Caonabo 35.', waRoom: (n) => `¡Hola! Quiero reservar la ${n} en Caonabo 35.`,
    factRooms: 'habitaciones', factFrom: 'desde / noche', roomsEye: 'Alojamiento', roomsH2: 'Nuestras habitaciones',
    roomsLead: (m) => `${m.rooms.length} habitaciones con ${join(inEveryRoom(m, 'es'), 'es')}. Tarifa directa ${priceSpan(m, 'es')}.`,
    from: 'desde', perNight: 'noche', details: 'Ver detalles', compare: 'Comparar todas las habitaciones',
    spacesEye: 'Instalaciones', spacesH2: 'Espacios y servicios', faqEye: 'Antes de reservar', faqH2: 'Preguntas frecuentes',
    contactEye: 'Contacto', contactH2: 'Encuéntranos', address: 'Dirección', waPhone: 'WhatsApp y teléfono', times: 'Check-in / check-out',
    writeWa: 'Escríbenos por WhatsApp', footer: 'Hotel boutique en Santo Domingo, República Dominicana',
    home: 'Inicio', roomsTitle: 'Habitaciones y precios', h1rooms: 'Habitaciones y precios en Caonabo 35, Santo Domingo',
    roomsPageLead: (m) => `Las ${m.rooms.length} habitaciones tienen ${join(inEveryRoom(m, 'es'), 'es')}. Estas son nuestras tarifas directas por noche, en dólares estadounidenses (US$).`,
    caption: 'Comparativa de habitaciones', thRoom: 'Habitación', thBed: 'Cama', thGuests: 'Huéspedes', thSize: 'Tamaño', thRate: 'Tarifa directa',
    rateNote: 'Tarifas por noche para reservas directas. Pueden variar según la fecha: al elegir tus fechas verás el total, que el hotel confirma con tu reserva.',
    includes: 'Incluye', infoH2: 'Información útil', ciLabel: 'Check-in', coLabel: 'Check-out', ci: (t) => `A partir de las ${t}`, co: (t) => `Hasta las ${t}`,
    cancelLabel: 'Cancelación', cancel: `Gratuita con ${CANCELLATION_HOURS} horas de anticipación`, minLabel: 'Estadía mínima', min: (n) => (n > 1 ? `${n} noches` : '1 noche'),
    howLabel: 'Cómo reservar', how: (p) => `En línea en caonabo35.com o por WhatsApp al ${p}`,
    hotelDesc: (m) => `Hotel boutique de ${m.rooms.length} habitaciones en Santo Domingo, República Dominicana: diseño contemporáneo, hospitalidad dominicana y reserva directa en caonabo35.com o por WhatsApp.`,
    heroFallback: (m) => `${m.rooms.length} habitaciones boutique en Santo Domingo, República Dominicana.`,
    roomAlt: (n) => `${n} en Caonabo 35`, heroAlt: 'Terraza de Caonabo 35 al anochecer',
  },
  en: {
    brandSub: 'Santo Domingo · D.R.', rooms: 'Rooms', spaces: 'Spaces', faqNav: 'FAQ', contact: 'Contact', switchTo: 'Español',
    h1k: 'Boutique hotel in Santo Domingo', seeRooms: 'See rooms & rates', bookWa: 'Book on WhatsApp',
    waHello: "Hi! I'd like to book at Caonabo 35.", waRoom: (n) => `Hi! I'd like to book ${n} at Caonabo 35.`,
    factRooms: 'rooms', factFrom: 'from / night', roomsEye: 'Accommodation', roomsH2: 'Our rooms',
    roomsLead: (m) => `${m.rooms.length} rooms, each with ${join(inEveryRoom(m, 'en'), 'en')}. Direct rates ${priceSpan(m, 'en')}.`,
    from: 'from', perNight: 'night', details: 'View details', compare: 'Compare all rooms',
    spacesEye: 'Facilities', spacesH2: 'Spaces & services', faqEye: 'Before you book', faqH2: 'Frequently asked questions',
    contactEye: 'Contact', contactH2: 'Find us', address: 'Address', waPhone: 'WhatsApp & phone', times: 'Check-in / check-out',
    writeWa: 'Message us on WhatsApp', footer: 'Boutique hotel in Santo Domingo, Dominican Republic',
    home: 'Home', roomsTitle: 'Rooms & rates', h1rooms: 'Rooms and rates at Caonabo 35, Santo Domingo',
    roomsPageLead: (m) => `All ${m.rooms.length} rooms have ${join(inEveryRoom(m, 'en'), 'en')}. These are our direct nightly rates, in US dollars (US$).`,
    caption: 'Room comparison', thRoom: 'Room', thBed: 'Bed', thGuests: 'Guests', thSize: 'Size', thRate: 'Direct rate',
    rateNote: "Nightly rates for direct bookings. Rates can vary by date: once you pick your dates you'll see the total, which the hotel confirms with your booking.",
    includes: 'Includes', infoH2: 'Good to know', ciLabel: 'Check-in', coLabel: 'Check-out', ci: (t) => `From ${t}`, co: (t) => `By ${t}`,
    cancelLabel: 'Cancellation', cancel: `Free with ${CANCELLATION_HOURS} hours' notice`, minLabel: 'Minimum stay', min: (n) => (n > 1 ? `${n} nights` : '1 night'),
    howLabel: 'How to book', how: (p) => `Online at caonabo35.com or on WhatsApp at ${p}`,
    hotelDesc: (m) => `A ${m.rooms.length}-room boutique hotel in Santo Domingo, Dominican Republic: contemporary design, Dominican hospitality and direct booking at caonabo35.com or on WhatsApp.`,
    heroFallback: (m) => `${m.rooms.length} boutique rooms in Santo Domingo, Dominican Republic.`,
    roomAlt: (n) => `${n} at Caonabo 35`, heroAlt: 'The Caonabo 35 terrace at dusk',
  },
};

const switchHref = (pg) => (ALT[pg.page] || ALT.home)[other(pg.lang)];
function header(pg) {
  const c = COPY[pg.lang], L = pg.lang, home = ALT.home[L];
  const onHome = (id) => (pg.page === 'home' ? `#${id}` : `${home === '/' ? '/' : home}#${id}`);
  const contact = pg.page === '404' ? onHome('contact') : '#contact';
  return `<header class="bar"><a class="logo" href="${home}">CAONABO 35<small>${c.brandSub}</small></a>
<nav aria-label="${L === 'es' ? 'Principal' : 'Main'}"><ul><li><a href="${ALT.rooms[L]}">${c.rooms}</a></li><li><a href="${onHome('amenities')}">${c.spaces}</a></li><li><a href="${onHome('faq')}">${c.faqNav}</a></li><li><a href="${contact}">${c.contact}</a></li><li><a href="${switchHref(pg)}" hreflang="${other(L)}" lang="${other(L)}">${c.switchTo}</a></li></ul></nav></header>`;
}

function roomCard(r, pg) {
  const c = COPY[pg.lang], L = pg.lang;
  return `<li><article class="room" id="${r.anchor}">
<img src="${esc(r.photo)}" alt="${esc(c.roomAlt(r.name[L]))}" width="640" height="480" loading="lazy" decoding="async">
<div class="in"><h3>${esc(r.name[L])}</h3>
<p class="meta">${esc(bedLabel(r.bed, L))} · ${esc(guestsLabel(r.guests, L))} · ${esc(sizeLabel(r))}</p>
${r.desc[L] ? `<p class="desc">${esc(r.desc[L])}</p>` : ''}
<ul class="tags">${r.amenities.map((a) => `<li>${esc(cap(amenityLabel(a, L)))}</li>`).join('')}</ul>
<p class="price">${c.from} <strong>${usd(r.price)}</strong> / ${c.perNight}</p>
<a class="more" href="${ALT.rooms[L]}#${r.anchor}">${c.details}</a></div></article></li>`;
}

function contactBlock(m, pg) {
  const c = COPY[pg.lang], h = m.hotel;
  const rows = [
    [c.address, h.addressLines.map(esc).join('<br>')],
    [c.waPhone, `<a href="${esc(waLink(m))}">${esc(h.phone || '+' + h.whatsapp)}</a>`],
    h.instagramUrl && ['Instagram', `<a href="${esc(h.instagramUrl)}">${esc(h.instagram)}</a>`],
    h.checkIn && h.checkOut && [c.times, `${esc(h.checkIn)} / ${esc(h.checkOut)}`],
  ].filter(Boolean);
  return `<section class="sec dk" id="contact" aria-labelledby="contact-h"><div class="wrap">
<div class="hd"><p class="eye">${c.contactEye}</p><h2 id="contact-h">${c.contactH2}</h2></div>
<dl class="contact">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
<p class="center"><a class="btn g" href="${esc(waLink(m, c.waHello))}">${c.writeWa}</a></p></div></section>`;
}

function footer(m, pg) {
  const c = COPY[pg.lang], L = pg.lang;
  return `<footer><a class="logo" href="${ALT.home[L]}">CAONABO 35</a><p>${c.footer}</p>
<ul><li><a href="${ALT.rooms[L]}">${c.roomsTitle}</a></li><li><a href="${esc(waLink(m, c.waHello))}">WhatsApp</a></li>${m.hotel.instagramUrl ? `<li><a href="${esc(m.hotel.instagramUrl)}">Instagram</a></li>` : ''}<li><a href="${switchHref(pg)}" hreflang="${other(L)}" lang="${other(L)}">${c.switchTo}</a></li></ul></footer>`;
}

function homeBody(m, pg) {
  const c = COPY[pg.lang], L = pg.lang, h = m.hotel;
  const sub = h.heroSubtitle[L] || c.heroFallback(m);
  return `<div class="c35s">${header(pg)}
<main>
<section class="hero" aria-labelledby="top-h"><img src="/img/terrace.jpg" alt="${c.heroAlt}" width="900" height="675" fetchpriority="high" decoding="async">
<div><p class="eye">${esc(h.street)} · Santo Domingo</p>
<h1 id="top-h"><span class="n">Caonabo <em>35</em></span> <span class="k">${c.h1k}</span></h1>
<p class="sub">${esc(sub)}</p>
<p class="btns"><a class="btn g" href="${ALT.rooms[L]}">${c.seeRooms}</a> <a class="btn o" href="${esc(waLink(m, c.waHello))}">${c.bookWa}</a></p>
<dl class="facts"><div><dt>${c.factRooms}</dt><dd>${m.rooms.length}</dd></div><div><dt>${c.factFrom}</dt><dd>${usd(m.minPrice)}</dd></div>${h.checkIn ? `<div><dt>check-in</dt><dd>${esc(h.checkIn)}</dd></div>` : ''}${h.checkOut ? `<div><dt>check-out</dt><dd>${esc(h.checkOut)}</dd></div>` : ''}</dl></div></section>
<section class="sec" id="rooms" aria-labelledby="rooms-h"><div class="wrap">
<div class="hd"><p class="eye">${c.roomsEye}</p><h2 id="rooms-h">${c.roomsH2}</h2><p class="lead">${esc(c.roomsLead(m))}</p></div>
<ul class="grid">${m.rooms.map((r) => roomCard(r, pg)).join('\n')}</ul>
<p class="center"><a class="btn o" href="${ALT.rooms[L]}">${c.compare}</a></p></div></section>
<section class="sec pa" id="amenities" aria-labelledby="spaces-h"><div class="wrap">
<div class="hd"><p class="eye">${c.spacesEye}</p><h2 id="spaces-h">${c.spacesH2}</h2></div>
<ul class="grid four">${SPACES.map((s) => `<li class="space"><img src="${s.photo}" alt="${esc(s[L][0])} · Caonabo 35" width="640" height="480" loading="lazy" decoding="async"><h3>${esc(s[L][0])}</h3><p>${esc(s[L][1])}</p></li>`).join('')}</ul></div></section>
<section class="sec" id="faq" aria-labelledby="faq-h"><div class="wrap">
<div class="hd"><p class="eye">${c.faqEye}</p><h2 id="faq-h">${c.faqH2}</h2></div>
<dl class="qa">${faq(m, L).map(([q, a]) => `<div><dt>${esc(q)}</dt><dd>${esc(a)}</dd></div>`).join('\n')}</dl></div></section>
${contactBlock(m, pg)}
</main>
${footer(m, pg)}</div>`;
}

function roomsBody(m, pg) {
  const c = COPY[pg.lang], L = pg.lang, h = m.hotel;
  const info = [
    h.checkIn && [c.ciLabel, c.ci(h.checkIn)],
    h.checkOut && [c.coLabel, c.co(h.checkOut)],
    [c.cancelLabel, c.cancel],
    [c.minLabel, c.min(h.minNights)],
    [c.howLabel, c.how(h.phone || '+' + h.whatsapp)],
  ].filter(Boolean);
  return `<div class="c35s">${header(pg)}
<main>
<section class="top"><div class="wrap">
<nav class="crumbs" aria-label="${L === 'es' ? 'Ruta' : 'Breadcrumb'}"><ol><li><a href="${ALT.home[L]}">${c.home}</a></li><li aria-current="page">${c.roomsTitle}</li></ol></nav>
<h1>${c.h1rooms}</h1>
<p class="lead">${esc(c.roomsPageLead(m))}</p>
<div class="tbl"><table><caption>${c.caption}</caption>
<thead><tr><th scope="col">${c.thRoom}</th><th scope="col">${c.thBed}</th><th scope="col">${c.thGuests}</th><th scope="col">${c.thSize}</th><th scope="col">${c.thRate}</th></tr></thead>
<tbody>${m.rooms.map((r) => `<tr><th scope="row"><a href="#${r.anchor}">${esc(r.name[L])}</a></th><td>${esc(cap(bedLabel(r.bed, L).replace(/^(Cama: |Cama |Bed: )/, '').replace(/ bed$/, '')))}</td><td>${r.guests}</td><td>${esc(sizeLabel(r))}</td><td class="p">${c.from} ${usd(r.price)}</td></tr>`).join('\n')}</tbody></table></div>
<p class="note">${c.rateNote}</p>
</div></section>
<section class="sec" id="rooms" aria-label="${c.rooms}"><div class="wrap">
${m.rooms.map((r) => `<article class="detail" id="${r.anchor}">
<img src="${esc(r.photo)}" alt="${esc(c.roomAlt(r.name[L]))}" width="640" height="480" loading="lazy" decoding="async">
<div class="in"><h2>${esc(r.name[L])}</h2>
<p class="meta">${esc(bedLabel(r.bed, L))} · ${esc(guestsLabel(r.guests, L))} · ${esc(sizeLabel(r))}</p>
${r.desc[L] ? `<p class="desc">${esc(r.desc[L])}</p>` : ''}
<p class="meta">${c.includes}: ${esc(join([L === 'es' ? 'baño privado' : 'private bathroom', ...r.amenities.map((a) => amenityLabel(a, L))], L))}</p>
<p class="price">${c.from} <strong>${usd(r.price)}</strong> / ${c.perNight}</p>
<a class="btn g" href="${esc(waLink(m, c.waRoom(r.name[L])))}">${c.bookWa}</a></div></article>`).join('\n')}
</div></section>
<section class="sec pa" aria-labelledby="info-h"><div class="wrap">
<div class="hd"><h2 id="info-h">${c.infoH2}</h2></div>
<dl class="qa">${info.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div></section>
${contactBlock(m, pg)}
</main>
${footer(m, pg)}</div>`;
}

function jsonLd(pg, m, t) {
  const L = pg.lang, c = COPY[L], h = m.hotel;
  const canonical = pageUrl(pg.page, L);
  const hotelId = `${ORIGIN}/#hotel`, siteId = `${ORIGIN}/#website`;
  const roomId = (r) => `${ORIGIN}/habitaciones#${r.anchor}`;
  const feature = (name) => ({ '@type': 'LocationFeatureSpecification', name, value: true });
  const hotel = {
    '@type': 'Hotel', '@id': hotelId, name: h.name, alternateName: ['Caonabo35'],
    description: c.hotelDesc(m), url: `${ORIGIN}/`,
    ...(h.phoneE164 && { telephone: h.phoneE164 }),
    image: HOTEL_IMAGES.map(abs),
    address: { '@type': 'PostalAddress', streetAddress: h.street, addressLocality: 'Santo Domingo', addressCountry: 'DO' },
    ...(h.checkInISO && { checkinTime: h.checkInISO }), ...(h.checkOutISO && { checkoutTime: h.checkOutISO }),
    numberOfRooms: m.rooms.length,
    priceRange: m.minPrice === m.maxPrice ? usd(m.minPrice) : `${usd(m.minPrice)}–${m.maxPrice}`,
    availableLanguage: ['es', 'en'],
    amenityFeature: [...SPACES.filter((s) => s.key !== 'lobby').map((s) => feature(s[L][0])), ...commonAmenities(m).map((a) => feature(cap(amenityLabel(a, L))))],
    ...(h.instagramUrl && { sameAs: [h.instagramUrl] }),
    containsPlace: m.rooms.map((r) => ({
      // Multi-typed so the Offer's itemOffered is in range (schema.org hotel guidance).
      '@type': ['HotelRoom', 'Product'], '@id': roomId(r), name: r.name[L],
      ...(r.desc[L] && { description: r.desc[L] }),
      bed: { '@type': 'BedDetails', typeOfBed: r.bed },
      occupancy: { '@type': 'QuantitativeValue', maxValue: r.guests },
      ...(r.m2 && { floorSize: { '@type': 'QuantitativeValue', value: r.m2, unitCode: 'MTK' } }),
      image: abs(r.photo),
      amenityFeature: [L === 'es' ? 'Baño privado' : 'Private bathroom', ...r.amenities.map((a) => cap(amenityLabel(a, L)))].map(feature),
    })),
    makesOffer: m.rooms.map((r) => ({
      '@type': 'Offer', url: `${pageUrl('rooms', L)}#${r.anchor}`, itemOffered: { '@id': roomId(r) },
      priceSpecification: { '@type': 'UnitPriceSpecification', price: r.price, priceCurrency: 'USD', unitCode: 'DAY' },
    })),
    potentialAction: { '@type': 'ReserveAction', target: { '@type': 'EntryPoint', urlTemplate: pageUrl('rooms', L) } },
  };
  const page = {
    '@type': pg.page === 'rooms' ? 'CollectionPage' : 'WebPage', '@id': `${canonical}#webpage`, url: canonical,
    name: t.title, description: t.description, inLanguage: L, isPartOf: { '@id': siteId }, about: { '@id': hotelId },
    primaryImageOfPage: { '@type': 'ImageObject', url: abs(OG_IMAGE.path) },
    ...(pg.page === 'rooms' && { breadcrumb: { '@id': `${canonical}#breadcrumb` } }),
  };
  const graph = [
    { '@type': 'WebSite', '@id': siteId, url: `${ORIGIN}/`, name: 'Caonabo 35', inLanguage: ['es', 'en'], publisher: { '@id': hotelId } },
    hotel, page,
  ];
  if (pg.page === 'rooms') {
    graph.push({ '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`, itemListElement: [
      { '@type': 'ListItem', position: 1, name: c.home, item: pageUrl('home', L) },
      { '@type': 'ListItem', position: 2, name: c.roomsTitle, item: canonical },
    ] });
  } else {
    graph.push({ '@type': 'FAQPage', '@id': `${canonical}#faq`, inLanguage: L, isPartOf: { '@id': `${canonical}#webpage` },
      mainEntity: faq(m, L).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  }
  // `<` escaped so DB text can never close the script element.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

function headTags(pg, m) {
  const L = pg.lang, t = meta(pg, m), canonical = pageUrl(pg.page, L);
  const og = abs(OG_IMAGE.path);
  return [
    `<title>${esc(t.title)}</title>`,
    `<meta name="description" content="${esc(t.description)}"/>`,
    `<link rel="canonical" href="${canonical}"/>`,
    `<link rel="alternate" hreflang="es" href="${pageUrl(pg.page, 'es')}"/>`,
    `<link rel="alternate" hreflang="en" href="${pageUrl(pg.page, 'en')}"/>`,
    `<link rel="alternate" hreflang="x-default" href="${pageUrl(pg.page, 'es')}"/>`,
    `<meta property="og:type" content="website"/>`,
    `<meta property="og:site_name" content="Caonabo 35"/>`,
    `<meta property="og:title" content="${esc(t.title)}"/>`,
    `<meta property="og:description" content="${esc(t.description)}"/>`,
    `<meta property="og:url" content="${canonical}"/>`,
    `<meta property="og:locale" content="${L === 'es' ? 'es_DO' : 'en_US'}"/>`,
    `<meta property="og:locale:alternate" content="${L === 'es' ? 'en_US' : 'es_DO'}"/>`,
    `<meta property="og:image" content="${og}"/>`,
    `<meta property="og:image:width" content="${OG_IMAGE.width}"/>`,
    `<meta property="og:image:height" content="${OG_IMAGE.height}"/>`,
    `<meta property="og:image:alt" content="${esc(COPY[L].heroAlt)}"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
    `<style>${STATIC_CSS}</style>`,
    `<script type="application/ld+json">${jsonLd(pg, m, t)}</script>`,
  ].join('\n');
}

const SEO_BLOCK = /<!--c35:seo-->[\s\S]*?<!--\/c35:seo-->/;

function renderPage(template, pg, m) {
  const body = pg.page === 'home' ? homeBody(m, pg) : roomsBody(m, pg);
  return template
    .replace(/<html lang="[^"]*">/, `<html lang="${pg.lang}">`)
    .replace(SEO_BLOCK, headTags(pg, m))
    .replace('<div id="root"></div>', `<div id="root" data-lang="${pg.lang}" data-page="${pg.page}">${body}</div>`);
}

function render404(template, m) {
  const es = { lang: 'es', page: '404' };
  const head = [
    '<title>Página no encontrada · Caonabo 35</title>',
    '<meta name="robots" content="noindex"/>',
    `<style>${STATIC_CSS}</style>`,
  ].join('\n');
  const body = `<div class="c35s">${header(es)}<main class="nf"><div>
<p class="eye">404</p><h1>Página no encontrada <span lang="en">· Page not found</span></h1>
<p>La página que buscas no existe o cambió de dirección.</p><p lang="en">The page you're looking for doesn't exist or has moved.</p>
<p class="btns" style="margin-top:2rem"><a class="btn g" href="/">Ir al inicio</a> <a class="btn o" href="/en" hreflang="en" lang="en">English site</a> <a class="btn o" href="/habitaciones">Habitaciones y precios</a> <a class="btn o" href="${esc(waLink(m, COPY.es.waHello))}">WhatsApp</a></p>
</div></main>${footer(m, es)}</div>`;
  return template
    .replace(SEO_BLOCK, head)
    .replace(/<script type="module"[^>]*><\/script>\s*/g, '')
    .replace(/<link rel="modulepreload"[^>]*>\s*/g, '')
    .replace(/<link rel="preload" as="image"[^>]*>\s*/g, '')
    .replace('<div id="root"></div>', body);
}

function sitemap() {
  const alt = (page) => ['es', 'en'].map((L) => `    <xhtml:link rel="alternate" hreflang="${L}" href="${pageUrl(page, L)}"/>`).concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(page, 'es')}"/>`).join('\n');
  const urls = PAGES.map((pg) => `  <url>\n    <loc>${pageUrl(pg.page, pg.lang)}</loc>\n${alt(pg.page)}\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

function llms(m) {
  const h = m.hotel;
  const every = { es: join(inEveryRoom(m, 'es'), 'es'), en: join(inEveryRoom(m, 'en'), 'en') };
  const room = (r) => {
    const extra = r.amenities.filter((a) => !commonAmenities(m).includes(a));
    const es = [bedLabel(r.bed, 'es').toLowerCase(), guestsLabel(r.guests, 'es').toLowerCase(), sizeLabel(r), ...extra.map((a) => amenityLabel(a, 'es'))].join(', ');
    const en = [bedLabel(r.bed, 'en'), guestsLabel(r.guests, 'en').toLowerCase(), sizeLabel(r), ...extra.map((a) => amenityLabel(a, 'en'))].join(', ');
    return `- ${r.name.es} / ${r.name.en}: ${es}; desde ${usd(r.price)}/noche · ${en}; from ${usd(r.price)}/night`;
  };
  return `# ${h.name}

> Hotel boutique de ${m.rooms.length} habitaciones en Santo Domingo, República Dominicana. A ${m.rooms.length}-room boutique hotel in Santo Domingo, Dominican Republic. Reserva directa / Book direct: ${ORIGIN} · WhatsApp ${h.phone || '+' + h.whatsapp}

## Datos clave / Key facts

- Dirección / Address: ${oneLineAddress(m)}
- Habitaciones / Rooms: ${m.rooms.length}
- Tarifa directa / Direct rate: desde ${usd(m.minPrice)} por noche (${m.minPrice === m.maxPrice ? usd(m.minPrice) : `${usd(m.minPrice)}–${usd(m.maxPrice)}`} según la habitación) / from ${usd(m.minPrice)} per night (${m.minPrice === m.maxPrice ? usd(m.minPrice) : `${usd(m.minPrice)}–${usd(m.maxPrice)}`} by room). Las tarifas pueden variar según la fecha / Rates can vary by date.
${h.checkIn && h.checkOut ? `- Check-in ${h.checkIn} · Check-out ${h.checkOut}\n` : ''}- Cancelación gratuita con ${CANCELLATION_HOURS} h de anticipación / Free cancellation with ${CANCELLATION_HOURS} hours' notice
- Estadía mínima / Minimum stay: ${h.minNights} ${h.minNights > 1 ? 'noches / nights' : 'noche / night'}
- En todas las habitaciones / In every room: ${every.es} / ${every.en}
- Espacios / Spaces: ${SPACES.map((s) => s.es[0]).join(', ')} / ${SPACES.map((s) => s.en[0]).join(', ')}
- Sitio web en español e inglés / Website in Spanish and English

## Habitaciones / Rooms

${m.rooms.map(room).join('\n')}

## Páginas / Pages

- [Inicio](${pageUrl('home', 'es')}): el hotel, habitaciones, espacios, preguntas frecuentes y contacto
- [Home (English)](${pageUrl('home', 'en')}): the hotel, rooms, spaces, FAQ and contact
- [Habitaciones y precios](${pageUrl('rooms', 'es')}): comparativa de las ${m.rooms.length} habitaciones con tarifas directas
- [Rooms & rates](${pageUrl('rooms', 'en')}): all ${m.rooms.length} rooms compared, with direct rates

## Reservar / Book

- En línea / Online: ${pageUrl('rooms', 'es')}
- WhatsApp: ${waLink(m)}
${h.instagramUrl ? `- Instagram: ${h.instagramUrl}\n` : ''}`;
}

// ── Self-checks ──────────────────────────────────────────────────────
const FORBIDDEN = [
  [/aggregateRating|"Review"|"@type":"Rating"/i, 'rating/review markup'],
  [/\b4[.,]9\b/, '"4.9" rating claim'], [/100\+/, '"100+" guests claim'], [/24\s*\/\s*7/, '"24/7" claim'],
  [/Sarah M\.|Pablo R\.|Emma T\.|Diego F\.|Claire D\.|magazine-worthy|mil veces|Magnifique/i, 'sample testimonial'],
  [/gazcue/i, '"Gazcue"'], [/GeoCoordinates|"geo"|latitude|longitude|hasMap|18\.447|-69\.967/i, 'coordinates'],
  [/ascensor|elevator|estacionamiento|parking|seguridad 24|vigilad|guarded|\b\d+\s?(km|min)\b/i, 'unconfirmed facility/distance claim'],
];

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;

function visibleText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
}

function checkGraph(graph, errs, where) {
  const ids = new Set(), refs = [];
  const walk = (node, top) => {
    if (Array.isArray(node)) return node.forEach((n) => walk(n, false));
    if (!node || typeof node !== 'object') return;
    const keys = Object.keys(node);
    if (keys.length === 1 && keys[0] === '@id') { refs.push(node['@id']); return; }
    if (!node['@type']) errs.push(`${where}: JSON-LD node without @type (${JSON.stringify(node).slice(0, 80)})`);
    if (node['@id']) ids.add(node['@id']);
    for (const [k, v] of Object.entries(node)) if (k !== '@id' && k !== '@type') walk(v, false);
  };
  graph.forEach((n) => walk(n, true));
  for (const r of refs) if (!ids.has(r)) errs.push(`${where}: JSON-LD reference ${r} does not resolve`);
}

function selfCheck(outputs, m) {
  const errs = [], report = [];
  const hreflangs = {};
  for (const pg of PAGES) {
    const html = outputs[pg.file], where = pg.file;
    const t = visibleText(html);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => x[1]);
    let ld;
    try { ld = blocks.map((b) => JSON.parse(b)); } catch (e) { errs.push(`${where}: JSON-LD does not parse (${e.message})`); continue; }
    if (ld.length !== 1) errs.push(`${where}: expected 1 JSON-LD block, got ${ld.length}`);
    const graph = ld[0]['@graph'] || [];
    checkGraph(graph, errs, where);
    const hotel = graph.find((n) => n['@type'] === 'Hotel');
    const offers = hotel?.makesOffer || [];
    const h1s = (html.match(/<h1[\s>]/g) || []).length;
    if (h1s !== 1) errs.push(`${where}: ${h1s} <h1> elements`);
    const bad = t.match(/\b(undefined|null|NaN|\[object Object\])\b/) || html.match(/"(undefined|null|NaN)"|:null\b|:NaN\b/);
    if (bad) errs.push(`${where}: contains "${bad[1] || bad[0]}"`);
    for (const [re, label] of FORBIDDEN) if (re.test(html)) errs.push(`${where}: forbidden ${label}`);
    if (!html.includes(`<html lang="${pg.lang}">`)) errs.push(`${where}: <html lang> is not ${pg.lang}`);
    if (!html.includes(`<div id="root" data-lang="${pg.lang}" data-page="${pg.page}">`)) errs.push(`${where}: #root data attributes missing`);
    if (!/<script type="module"[^>]+src="\/assets\/[^"]+\.js"/.test(html)) errs.push(`${where}: app bundle script missing`);
    // Prices: every room's HTML price(s) must equal its JSON-LD offer, and no stray amounts.
    const offerByAnchor = Object.fromEntries(offers.map((o) => [o.url.split('#')[1], o.priceSpecification?.price]));
    for (const r of m.rooms) {
      const price = offerByAnchor[r.anchor];
      if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) errs.push(`${where}: offer price for ${r.anchor} not a positive number`);
      const block = (html.match(new RegExp(`<article[^>]*id="${r.anchor}"[\\s\\S]*?</article>`)) || [''])[0];
      const shown = [...block.matchAll(/US\$(\d+)/g)].map((x) => Number(x[1]));
      if (!shown.length || shown.some((p) => p !== price)) errs.push(`${where}: ${r.anchor} HTML price ${shown.join('/') || 'missing'} != JSON-LD ${price}`);
      if (pg.page === 'rooms') {
        const row = (html.match(new RegExp(`<tr><th scope="row"><a href="#${r.anchor}">[\\s\\S]*?</tr>`)) || [''])[0];
        const rowPrice = Number((row.match(/US\$(\d+)/) || [])[1]);
        if (rowPrice !== price) errs.push(`${where}: ${r.anchor} table price ${rowPrice} != JSON-LD ${price}`);
      }
    }
    const allowed = new Set([...offers.map((o) => o.priceSpecification.price), m.minPrice, m.maxPrice]);
    for (const x of t.matchAll(/US\$(\d+)/g)) if (!allowed.has(Number(x[1]))) errs.push(`${where}: stray price US$${x[1]}`);
    if (hotel?.priceRange !== (m.minPrice === m.maxPrice ? usd(m.minPrice) : `${usd(m.minPrice)}–${m.maxPrice}`)) errs.push(`${where}: priceRange mismatch`);
    // Canonical + hreflang: absolute apex URLs, self-referencing, reciprocal (checked after the loop).
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    if (canonical !== pageUrl(pg.page, pg.lang)) errs.push(`${where}: canonical ${canonical}`);
    const alts = Object.fromEntries([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((x) => [x[1], x[2]]));
    for (const u of [canonical, ...Object.values(alts), (html.match(/og:url" content="([^"]+)"/) || [])[1]]) {
      if (!u || !u.startsWith(`${ORIGIN}/`) || /www\./.test(u)) errs.push(`${where}: non-apex/relative URL ${u}`);
    }
    if (alts[pg.lang] !== canonical) errs.push(`${where}: hreflang ${pg.lang} is not self-referencing`);
    hreflangs[canonical] = alts;
    const need = pg.lang === 'es' ? ['desde US$'] : ['from US$'];
    for (const s of [...need, m.hotel.street, m.hotel.whatsapp, ...m.rooms.map((r) => r.name[pg.lang])]) if (!html.includes(esc(s)) && !t.includes(s)) errs.push(`${where}: missing "${s}"`);
    const desc = (html.match(/<meta name="description" content="([^"]+)"/) || [])[1] || '';
    report.push(`${where.padEnd(18)} lang=${pg.lang} h1=${h1s} jsonld=${graph.length} nodes offers=${offers.length} desc=${desc.length}ch html=${(html.length / 1024).toFixed(1)}KB`);
  }
  for (const [url, alts] of Object.entries(hreflangs)) {
    for (const [L, target] of Object.entries(alts)) {
      if (L === 'x-default') continue;
      if (!hreflangs[target]) errs.push(`hreflang ${url} -> ${target}: target page not generated`);
      else if (Object.values(hreflangs[target]).indexOf(url) === -1) errs.push(`hreflang ${url} -> ${target}: not reciprocal`);
    }
  }
  // No email address may appear anywhere: page text, attributes (mailto:), JSON-LD, 404, sitemap or llms.txt.
  for (const [file, content] of Object.entries(outputs)) {
    const hit = content.match(EMAIL_RE) || content.match(/mailto:|"email"\s*:/i);
    if (hit) errs.push(`${file}: contains an email address or email field (${hit[0]})`);
  }
  const nf = outputs['404.html'];
  if (!/noindex/.test(nf) || /type="module"/.test(nf) || (nf.match(/<h1[\s>]/g) || []).length !== 1) errs.push('404.html: must be noindex, static, one h1');
  const sm = outputs['sitemap.xml'];
  if ((sm.match(/<loc>/g) || []).length !== PAGES.length || /www\.caonabo35|lastmod/.test(sm)) errs.push('sitemap.xml: unexpected content');
  const ll = outputs['llms.txt'];
  for (const r of m.rooms) if (!ll.includes(`desde ${usd(r.price)}/noche`)) errs.push(`llms.txt: price for ${r.anchor} missing`);
  for (const [re, label] of FORBIDDEN) if (re.test(ll) || re.test(sm)) errs.push(`llms.txt/sitemap: forbidden ${label}`);
  if (/\b(undefined|null|NaN)\b/.test(ll)) errs.push('llms.txt: contains undefined/null/NaN');
  return { errs, report };
}

// ── Main ─────────────────────────────────────────────────────────────
function loadFallback() {
  return JSON.parse(fs.readFileSync(FALLBACK_FILE, 'utf8'));
}

function renderAll(template, m) {
  const out = {};
  for (const pg of PAGES) out[pg.file] = renderPage(template, pg, m);
  out['404.html'] = render404(template, m);
  out['sitemap.xml'] = sitemap();
  out['llms.txt'] = llms(m);
  return out;
}

async function main() {
  if (process.argv.includes('--snapshot')) {
    const live = await fetchLive();
    buildModel(live);
    const slim = {
      _note: 'Fallback for scripts/prerender.mjs when Supabase is unreachable at build time. Refresh: npm run seo:snapshot',
      snapshot_date: new Date().toISOString().slice(0, 10),
      rooms: live.rooms.map((r) => ({ ...r, photos: Array.isArray(r.photos) ? r.photos.map((p) => ({ url: p.url, label: p.label })) : r.photos })).sort((a, b) => Number(a.id) - Number(b.id)),
      settings: live.settings,
    };
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(slim, null, 2) + '\n');
    console.log(`[prerender] snapshot written: ${path.relative(ROOT, FALLBACK_FILE)} (${slim.rooms.length} rooms)`);
    return;
  }

  const templatePath = path.join(DIST, 'index.html');
  const template = fs.readFileSync(templatePath, 'utf8');
  if (!SEO_BLOCK.test(template) || !template.includes('<div id="root"></div>')) {
    throw new Error('dist/index.html is not the Vite shell (already prerendered?) — run `vite build` first');
  }

  const sources = [];
  try {
    sources.push({ label: 'live database', model: buildModel(await fetchLive()) });
  } catch (e) {
    console.warn(`[prerender] live data unavailable (${e.message}); using fallback snapshot`);
  }
  const fb = loadFallback();
  sources.push({ label: `fallback snapshot ${fb.snapshot_date}`, model: buildModel(fb) });

  for (const [i, src] of sources.entries()) {
    const outputs = renderAll(template, src.model);
    const { errs, report } = selfCheck(outputs, src.model);
    if (errs.length) {
      console.error(`[prerender] self-check FAILED with ${src.label}:\n  - ${errs.join('\n  - ')}`);
      if (i < sources.length - 1) continue;
      process.exit(1);
    }
    for (const [file, content] of Object.entries(outputs)) {
      fs.mkdirSync(path.dirname(path.join(DIST, file)), { recursive: true });
      fs.writeFileSync(path.join(DIST, file), content);
    }
    const m = src.model;
    console.log(`[prerender] data: ${src.label} · ${m.rooms.length} rooms · direct rates ${usd(m.minPrice)}–${usd(m.maxPrice)}`);
    console.log(`[prerender] self-check passed:\n  ${report.join('\n  ')}`);
    console.log(`[prerender] wrote ${Object.keys(outputs).join(', ')}`);
    return;
  }
}

main().catch((e) => { console.error(`[prerender] ${e.stack || e.message}`); process.exit(1); });
