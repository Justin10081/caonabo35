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

// The 4 photos for the strip under the hero: the ones the owner ticked, in gallery
// order, topped up with featured and then any other photos so it's never half empty.
export function stripPhotos(list) {
  const picked = list.filter(g => g.strip);
  const rest = list.filter(g => !g.strip);
  return [...picked, ...rest.filter(g => g.featured), ...rest.filter(g => !g.featured)].slice(0, STRIP_MAX);
}

// Loads the gallery once on mount.
//   rows   — DB rows (for the admin), null until the first load finishes
//   status — 'loading' | 'ok' | 'error'
//   list   — what the public page shows: DB rows, or the bundled photos if the
//            query failed or came back empty. Never empty after loading.
export function useGallery(bundled) {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState('loading');

  const reload = useCallback(async () => {
    setStatus(s => (s === 'ok' ? s : 'loading'));
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);   // a hung request must not blank the gallery
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
    } catch (e) {
      console.warn('Gallery: using bundled photos —', e?.message || e);
      setStatus('error');
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // A link to /#gallery (e.g. "Ver la galería en la web" in the admin) arrives
  // before React has drawn the page, so the browser's own jump misses. Re-apply
  // it once the photos are in.
  useEffect(() => {
    if (status === 'loading') return;
    try {
      if (window.location.hash === '#gallery') requestAnimationFrame(() => document.getElementById('gallery')?.scrollIntoView());
    } catch { /* not in a browser */ }
  }, [status]);

  const list = status === 'loading' && !rows
    ? []
    : (rows && rows.length ? rows : withDefaultStrip(bundled));

  return { rows, setRows, status, reload, list };
}
