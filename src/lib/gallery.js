import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

// ── Public gallery, owner-editable ─────────────────────────────────────────
// Rows live in public.gallery_photos (migrations/20260928_gallery_photos.sql):
// anyone can read, only public.is_admin() can write. Uploaded photos go to the
// SAME storage bucket as room photos (its policies are already admin-only),
// under a `gallery/` prefix. The 14 photos bundled in /img/ were seeded as rows
// (path = NULL), so the owner can reorder, edit or delete the originals too.

export const GALLERY_BUCKET = 'room-photos';
export const GALLERY_TABLE = 'gallery_photos';
export const STRIP_MAX = 4;   // the strip under the hero is a 4-column grid

// [tag, Spanish label, English label]. These ARE the public filter buttons, so a
// photo can never be tagged with something no filter shows.
export const GALLERY_TAGS = [
  ['outdoor',  'Exterior',      'Outdoor'],
  ['living',   'Salas',         'Living'],
  ['bedroom',  'Habitaciones',  'Rooms'],
  ['bathroom', 'Baños',         'Bathrooms'],
  ['common',   'Áreas Comunes', 'Common'],
  ['detail',   'Detalles',      'Details'],
];
const TAG_SET = new Set(GALLERY_TAGS.map(t => t[0]));
// The old hard-coded list used "exterior" for the façade, a tag no filter showed.
export const normalizeTag = (tag) => (tag === 'exterior' ? 'outdoor' : TAG_SET.has(tag) ? tag : 'detail');

// DB row → the same shape the public page has always used ({photo,label,tag,featured}).
export function mapGalleryRow(r) {
  return {
    id: r.id,
    photo: r.url,
    path: r.path || null,
    label: r.label || '',
    labelEn: r.label_en || '',
    tag: normalizeTag(r.tag),
    featured: !!r.featured,
    strip: !!r.show_in_strip,
    sort: r.sort_order,
  };
}

// Photos used when the DB can't be reached — the four that were always in the strip.
const DEFAULT_STRIP = ['/img/livingBig.jpg', '/img/reception.jpg', '/img/corridor.jpg', '/img/amberChairs.jpg'];
const withDefaultStrip = (list) => list.map(g => ({ ...g, tag: normalizeTag(g.tag), strip: g.strip ?? DEFAULT_STRIP.includes(g.photo) }));

// Only two kinds of photo URL are valid (the DB enforces the same rule with a
// CHECK constraint): a photo bundled with the site, or one in our public bucket.
const PUBLIC_PREFIX = supabase.storage.from(GALLERY_BUCKET).getPublicUrl('').data.publicUrl.replace(/\/?$/, '/');
export const isSafePhotoUrl = (u) => typeof u === 'string' && (u.startsWith('/img/') || u.startsWith(PUBLIC_PREFIX));

// The 4 photos for the strip under the hero: the ones the owner ticked, then the
// next photos in gallery order, so the strip never has an empty column.
export function stripPhotos(list) {
  const picked = list.filter(g => g.strip);
  return [...picked, ...list.filter(g => !g.strip)].slice(0, STRIP_MAX);
}

// Last good gallery, per visitor, so a repeat visit paints the owner's current
// photos immediately instead of the bundled ones. Purely a convenience: any
// storage error just means we fall back to the bundled set until the DB answers.
const CACHE_KEY = 'c35_gallery_v1';
function readCache() {
  try {
    const a = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null');
    if (!Array.isArray(a)) return null;
    const ok = a.filter(g => g && isSafePhotoUrl(g.photo)).map(g => ({
      id: String(g.id || ''), photo: g.photo, path: null, label: String(g.label || ''), labelEn: String(g.labelEn || ''),
      tag: normalizeTag(g.tag), featured: !!g.featured, strip: !!g.strip, sort: Number(g.sort) || 0,
    }));
    return ok.length ? ok : null;
  } catch { return null; }
}
function writeCache(rows) {
  try {
    if (rows && rows.length) window.localStorage.setItem(CACHE_KEY, JSON.stringify(rows.map(({ id, photo, label, labelEn, tag, featured, strip, sort }) => ({ id, photo, label, labelEn, tag, featured, strip, sort }))));
    else window.localStorage.removeItem(CACHE_KEY);
  } catch { /* private mode / blocked storage: fine */ }
}

// Loads the gallery on mount.
//   rows   — DB rows (for the admin), null until the first load finishes
//   status — 'loading' | 'ok' | 'error'
//   list   — what the public page shows. NEVER empty: fresh DB rows; while loading
//            (or if the DB fails) the last good list cached in this browser, else
//            the bundled photos. A DB with zero rows also shows the bundled photos.
//   reload — re-reads the DB; resolves true on success
//   markBroken(src) — call from an <img onError>: that photo is dropped from `list`
//   isBroken(src) — for photos rendered outside `list` (e.g. room covers)
export function useGallery(bundled) {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState('loading');
  const [cached] = useState(readCache);
  const [broken, setBroken] = useState(() => new Set());
  const markBroken = useCallback((src) => setBroken(s => (s.has(src) ? s : new Set(s).add(src))), []);
  const isBroken = useCallback((src) => broken.has(src), [broken]);

  const reload = useCallback(async () => {
    setStatus(s => (s === 'ok' ? s : 'loading'));
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);   // a hung request must not strand the page
    try {
      const { data, error } = await supabase
        .from(GALLERY_TABLE)
        .select('id,url,path,label,label_en,tag,featured,show_in_strip,sort_order')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
        .abortSignal(ctl.signal);
      if (error || !Array.isArray(data)) throw error || new Error('no data');
      setRows(data.map(mapGalleryRow));
      setStatus('ok');
      return true;
    } catch (e) {
      console.warn('Gallery: using cached/bundled photos —', e?.message || e);
      setStatus('error');
      return false;
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { if (rows) writeCache(rows); }, [rows]);

  // A link to /#gallery (e.g. "Ver la galería en la web" in the admin) arrives
  // before React has drawn the page, so the browser's own jump misses. Re-apply
  // it once the photos are in.
  useEffect(() => {
    if (status === 'loading') return;
    try {
      if (window.location.hash === '#gallery') requestAnimationFrame(() => document.getElementById('gallery')?.scrollIntoView());
    } catch { /* not in a browser */ }
  }, [status]);

  const base = rows && rows.length ? rows
    : (rows === null && cached) ? cached
    : withDefaultStrip(bundled);
  // A photo whose image fails to load (e.g. one the owner has since deleted but
  // this visitor still has cached, during a slow DB or an outage) is skipped, so
  // the grid, the strip (which then takes the next photo) and the lightbox close
  // up around it. If every photo failed, show what we have rather than nothing.
  const usable = (arr) => arr.filter(g => !broken.has(g.photo));
  let list = usable(base);
  if (!list.length) list = usable(withDefaultStrip(bundled));
  if (!list.length) list = base;

  return { rows, setRows, status, reload, list, markBroken, isBroken };
}
