import { useRef, useState } from "react";
import { supabase } from "./lib/supabase.js";
import { GALLERY_BUCKET, GALLERY_TABLE, GALLERY_TAGS, STRIP_MAX, mapGalleryRow } from "./lib/gallery.js";

// ─── Admin › Galería ───────────────────────────────────────────────────────
// Full control of the public gallery for the owner: add photos, delete, reorder,
// captions (ES/EN), category, "foto grande", and the 4-photo strip under the hero.
//
// Same rule as the room photos: every change is written to the DB FIRST and the
// screen only changes once the DB confirms it, so nothing "saves" and then
// reverts on refresh. A deleted upload's file is removed from Storage only AFTER
// its row is gone, so the site can never point at a missing image.

const K = { ink:"#2A1F16", warm:"#8B6B4E", taupe:"#8a7a6a", sand:"#D4C5B0", smoke:"#F0EDE8", gold:"#C4973A", danger:"#C62828", ok:"#2e7d32" };
const font = "'Lato',sans-serif";

const bigBtn = (disabled, extra={}) => ({
  minHeight:46, padding:".55rem .8rem", fontFamily:font, fontSize:".9rem", fontWeight:600,
  background:"#fff", color:K.ink, border:`1px solid ${K.sand}`, borderRadius:6,
  cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.4:1,
  display:"inline-flex", alignItems:"center", justifyContent:"center", gap:".35rem", ...extra,
});
const toggleBtn = (on, disabled) => bigBtn(disabled, {
  background:on?K.gold:"#fff", color:K.ink, borderColor:on?K.gold:K.sand, textAlign:"left", justifyContent:"flex-start",
});
const fieldLabel = { display:"block", fontFamily:font, fontSize:".8rem", fontWeight:700, color:K.warm, marginBottom:".3rem" };
const textInput = { width:"100%", minHeight:46, padding:".6rem .75rem", fontSize:"1rem", fontFamily:font, border:`1px solid ${K.sand}`, borderRadius:6, background:K.smoke, color:K.ink, outline:"none" };

export default function GalleryManager({ gal, showToast, compressToBlob }) {
  const { rows, setRows, status, reload } = gal;
  const [busy, setBusyMsg] = useState("");        // non-empty = a write is in flight (message shown)
  const pending = useRef(0);                      // overlapping writes (e.g. a caption blur during a reorder)
  const saving = useRef(new Set());               // caption saves in flight, so blur + button can't double-save
  const begin = (msg) => { pending.current++; setBusyMsg(msg); };
  const end = () => { pending.current = Math.max(0, pending.current - 1); if (!pending.current) setBusyMsg(""); };
  const [drafts, setDrafts] = useState({});       // {id: {label, labelEn}} while typing
  const [fresh, setFresh] = useState(() => new Set()); // ids uploaded this session → "NUEVA" badge
  const list = rows || [];
  const stripCount = list.filter(g => g.strip).length;
  const locked = !!busy;

  const fail = (msg, error) => { showToast("❌ " + msg + (error?.message ? ": " + error.message : "")); };

  // Every write goes through run(): busy banner on, controls locked, and the
  // banner always clears, even if something throws.
  async function run(msg, fn) {
    begin(msg);
    try { return await fn(); }
    catch (e) { fail("Algo salió mal", e); return false; }
    finally { end(); }
  }

  // ── single-field edits ───────────────────────────────────────────────
  function savePatch(g, dbPatch, uiPatch, okMsg) {
    return run("Guardando…", async () => {
      // .select() so a write that RLS silently skipped (e.g. an expired session) counts as a failure
      const { data, error } = await supabase.from(GALLERY_TABLE).update(dbPatch).eq("id", g.id).select("id");
      if (error || !data || data.length !== 1) { fail("No se pudo guardar", error || { message: "¿sesión expirada? Vuelve a entrar." }); return false; }
      setRows(prev => (prev || []).map(x => x.id === g.id ? { ...x, ...uiPatch } : x));
      if (okMsg) showToast(okMsg);
      return true;
    });
  }

  async function saveCaption(g) {
    const d = drafts[g.id];
    if (!d || saving.current.has(g.id)) return;
    const label = (d.label ?? g.label).trim(), labelEn = (d.labelEn ?? g.labelEn).trim();
    if (label === g.label && labelEn === g.labelEn) { clearDraft(g.id); return; }
    saving.current.add(g.id);
    try { await savePatch(g, { label, label_en: labelEn }, { label, labelEn }, "Título guardado ✓"); }
    finally { saving.current.delete(g.id); clearDraft(g.id); }   // on failure the box snaps back to what is really saved
  }
  const clearDraft = (id) => setDrafts(prev => { const n = { ...prev }; delete n[id]; return n; });
  const setDraft = (id, k, v) => setDrafts(prev => ({ ...prev, [id]: { ...prev[id], [k]: v } }));

  function toggleStrip(g) {
    if (!g.strip && stripCount >= STRIP_MAX) {
      showToast(`Ya hay ${STRIP_MAX} fotos en la franja de portada. Quita una primero.`);
      return;
    }
    savePatch(g, { show_in_strip: !g.strip }, { strip: !g.strip }, !g.strip ? "Añadida a la franja de portada ✓" : "Quitada de la franja de portada");
  }

  // ── order ────────────────────────────────────────────────────────────
  // Rewrites sort_order for the whole list in ONE upsert (atomic), so a
  // half-finished swap can never leave two photos fighting for a position.
  function saveOrder(next, okMsg) {
    return run("Guardando orden…", async () => {
      const payload = next.map((g, i) => ({ id: g.id, url: g.photo, sort_order: (i + 1) * 10 }));
      const { data, error } = await supabase.from(GALLERY_TABLE).upsert(payload, { onConflict: "id" }).select("id");
      if (error || !data || data.length !== payload.length) { fail("No se pudo cambiar el orden", error); return false; }
      const pos = new Map(payload.map(p => [p.id, p.sort_order]));
      setRows(prev => (prev || []).map(x => pos.has(x.id) ? { ...x, sort: pos.get(x.id) } : x).sort((a, b) => a.sort - b.sort));
      if (okMsg) showToast(okMsg);
      return true;
    });
  }
  function move(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[idx], next[j]] = [next[j], next[idx]];
    saveOrder(next);
  }
  function moveToTop(idx) {
    if (idx <= 0) return;
    const next = [...list];
    const [g] = next.splice(idx, 1);
    next.unshift(g);
    saveOrder(next, "Ahora es la primera foto ✓");
  }

  // ── delete ───────────────────────────────────────────────────────────
  function remove(g) {
    if (list.length <= 1) { showToast("La galería necesita al menos una foto. Añade otra antes de borrar esta."); return; }
    if (!window.confirm(`¿Eliminar la foto "${g.label || "sin título"}" de la galería?\n\nNo se puede deshacer.`)) return;
    return run("Eliminando…", async () => {
      const { data, error } = await supabase.from(GALLERY_TABLE).delete().eq("id", g.id).select("id");
      if (error || !data || data.length !== 1) { fail("No se pudo eliminar", error || { message: "¿sesión expirada? Vuelve a entrar." }); return false; }
      if (g.path) {   // only uploads have a stored file; the original /img/ photos ship with the site
        const { error: se } = await supabase.storage.from(GALLERY_BUCKET).remove([g.path]);
        if (se) console.warn("Storage cleanup failed (row already deleted):", se.message);
      }
      setRows(prev => (prev || []).filter(x => x.id !== g.id));
      clearDraft(g.id);
      showToast("Foto eliminada ✓");
      return true;
    });
  }

  // ── upload ───────────────────────────────────────────────────────────
  function upload(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    return run("Subiendo foto…", async () => {
      const uploaded = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setBusyMsg(files.length > 1 ? `Subiendo foto ${i + 1} de ${files.length}…` : "Subiendo foto…");
        if (file.type && !file.type.startsWith("image/")) { showToast(`❌ "${file.name}" no es una foto`); continue; }
        let blob;
        try { blob = await compressToBlob(file, 1600, 1200, 0.82); }
        catch { showToast(`❌ No se pudo leer "${file.name}". Usa fotos JPG o PNG.`); continue; }
        if (blob.size > 4.5 * 1024 * 1024) { showToast(`❌ "${file.name}" es demasiado grande`); continue; }
        const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await supabase.storage.from(GALLERY_BUCKET)
          .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
        if (error) { fail(`No se pudo subir "${file.name}"`, error); continue; }
        const { data } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
        uploaded.push({ url: data.publicUrl, path });
      }
      if (!uploaded.length) return false;

      setBusyMsg("Guardando…");
      const base = list.reduce((m, g) => Math.max(m, g.sort || 0), 0);
      const insert = uploaded.map((u, k) => ({ url: u.url, path: u.path, label: "", label_en: "", tag: "detail", featured: false, show_in_strip: false, sort_order: base + (k + 1) * 10 }));
      const { data, error } = await supabase.from(GALLERY_TABLE).insert(insert).select("*");
      if (error || !data || data.length !== insert.length) {
        // Nothing references these files, so don't leave them orphaned in Storage.
        await supabase.storage.from(GALLERY_BUCKET).remove(uploaded.map(u => u.path)).catch(() => {});
        fail("No se pudieron guardar las fotos", error);
        return false;
      }
      const added = data.map(mapGalleryRow);
      setRows(prev => [...(prev || []), ...added].sort((a, b) => a.sort - b.sort));
      setFresh(prev => new Set([...prev, ...added.map(a => a.id)]));
      showToast(`${added.length} foto${added.length > 1 ? "s añadidas" : " añadida"} al final ✓ Ponle título y categoría.`);
      setTimeout(() => document.getElementById(`gal-card-${added[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
      return true;
    });
  }

  // ── render ───────────────────────────────────────────────────────────
  const uploadButton = (
    <label className="btn-gold" style={{ minHeight:50, padding:".8rem 1.6rem", fontSize:".85rem", cursor:locked||!rows?"not-allowed":"pointer", opacity:locked||!rows?0.5:1, margin:0, borderRadius:6 }}>
      + Añadir fotos
      <input type="file" accept="image/*" multiple disabled={locked || !rows} style={{ display:"none" }}
        onChange={e => { upload(e.target.files); e.target.value = ""; }}/>
    </label>
  );

  return (
    <div style={{ maxWidth:1200 }}>
      <div className="card" style={{ padding:"1.25rem 1.4rem", marginBottom:"1.25rem", borderLeft:`4px solid ${K.gold}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"1rem", flexWrap:"wrap" }}>
          <div style={{ flex:"1 1 320px" }}>
            <div style={{ fontSize:"1.35rem", color:K.ink, marginBottom:".35rem" }}>Fotos de la galería</div>
            <p style={{ fontFamily:font, fontSize:".92rem", color:K.warm, lineHeight:1.55 }}>
              Estas son las fotos de la sección «Galería» de la web. Los cambios se guardan al instante;
              los visitantes los ven al abrir o recargar la página.
            </p>
            <ul style={{ fontFamily:font, fontSize:".85rem", color:K.taupe, lineHeight:1.6, margin:".5rem 0 0 1.1rem" }}>
              <li><b>Foto grande</b>: se ve más alta en la galería.</li>
              <li><b>Franja de portada</b>: las {STRIP_MAX} fotos debajo de la imagen principal de la web.</li>
              <li>El orden aquí es el orden en la web. Usa las flechas para moverlas.</li>
            </ul>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:".6rem", alignItems:"stretch", flex:"0 1 240px" }}>
            {uploadButton}
            <a href="/#gallery" target="_blank" rel="noopener" style={{ ...bigBtn(false), textDecoration:"none", fontSize:".85rem" }}>Ver la galería en la web ↗</a>
            {rows && <div style={{ fontFamily:font, fontSize:".8rem", color:K.taupe, textAlign:"center" }}>{list.length} foto{list.length !== 1 ? "s" : ""} · {stripCount}/{STRIP_MAX} en la franja</div>}
          </div>
        </div>
      </div>

      {busy && (
        <div role="status" style={{ position:"sticky", top:64, zIndex:40, background:K.ink, color:"#E8C97A", fontFamily:font, fontSize:".92rem", padding:".75rem 1rem", marginBottom:"1rem", borderRadius:6, display:"flex", alignItems:"center", gap:".6rem" }}>
          <span style={{ width:16, height:16, border:"2px solid #E8C97A", borderTopColor:"transparent", borderRadius:"50%", display:"inline-block", animation:"spin .8s linear infinite" }}/>
          {busy}
        </div>
      )}

      {!rows && status === "loading" && (
        <div className="card" style={{ padding:"2rem", fontFamily:font, color:K.taupe, textAlign:"center" }}>Cargando galería…</div>
      )}

      {!rows && status === "error" && (
        <div className="card" style={{ padding:"1.5rem", fontFamily:font, borderLeft:`4px solid ${K.danger}` }}>
          <div style={{ color:K.danger, fontWeight:700, marginBottom:".4rem" }}>No se pudo cargar la galería.</div>
          <div style={{ color:K.warm, fontSize:".9rem", marginBottom:"1rem" }}>La web sigue mostrando las fotos originales. Revisa la conexión e inténtalo de nuevo.</div>
          <button type="button" className="btn-sm" style={{ minHeight:46, padding:".6rem 1.4rem", fontSize:".8rem" }} onClick={reload}>Reintentar</button>
        </div>
      )}

      {rows && rows.length === 0 && (
        <div className="card" style={{ padding:"1.5rem", fontFamily:font, color:K.warm, fontSize:".92rem" }}>
          La galería está vacía, así que la web muestra las fotos originales. Añade fotos para reemplazarlas.
        </div>
      )}

      {rows && rows.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:"1.1rem" }}>
          {list.map((g, i) => {
            const d = drafts[g.id] || {};
            const label = d.label ?? g.label, labelEn = d.labelEn ?? g.labelEn;
            const dirty = label.trim() !== g.label || labelEn.trim() !== g.labelEn;
            const idEs = `gal-es-${g.id}`, idEn = `gal-en-${g.id}`, idTag = `gal-tag-${g.id}`;
            const onKey = (e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { clearDraft(g.id); e.currentTarget.blur(); } };
            return (
              <div key={g.id} id={`gal-card-${g.id}`} className="card" data-testid="gallery-admin-card"
                style={{ overflow:"hidden", border:`1px solid ${fresh.has(g.id) ? K.gold : "transparent"}`, borderRadius:8 }}>
                <a href={g.photo} target="_blank" rel="noopener" title="Ver foto completa" style={{ display:"block", position:"relative", aspectRatio:"16 / 10", background:K.smoke }}>
                  <img src={g.photo} alt={g.label || "Foto de la galería"} loading="lazy" decoding="async" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                  <span style={{ position:"absolute", top:8, left:8, background:"rgba(42,31,22,.85)", color:"#fff", fontFamily:font, fontSize:".85rem", fontWeight:700, padding:".2rem .55rem", borderRadius:4 }}>#{i + 1}</span>
                  <span style={{ position:"absolute", top:8, right:8, display:"flex", gap:4, flexWrap:"wrap", justifyContent:"flex-end" }}>
                    {fresh.has(g.id) && <span style={{ background:K.ok, color:"#fff", fontFamily:font, fontSize:".7rem", fontWeight:700, padding:".2rem .45rem", borderRadius:4 }}>NUEVA</span>}
                    {g.strip && <span style={{ background:K.gold, color:K.ink, fontFamily:font, fontSize:".7rem", fontWeight:700, padding:".2rem .45rem", borderRadius:4 }}>PORTADA</span>}
                    {g.featured && <span style={{ background:"#fff", color:K.ink, fontFamily:font, fontSize:".7rem", fontWeight:700, padding:".2rem .45rem", borderRadius:4 }}>GRANDE</span>}
                  </span>
                </a>
                <div style={{ padding:"1rem", display:"grid", gap:".8rem" }}>
                  <div>
                    <label htmlFor={idEs} style={fieldLabel}>Título (español)</label>
                    <input id={idEs} style={textInput} value={label} placeholder="Escribe un título…" maxLength={80}
                      onChange={e => setDraft(g.id, "label", e.target.value)} onBlur={() => saveCaption(g)} onKeyDown={onKey}/>
                  </div>
                  <div>
                    <label htmlFor={idEn} style={fieldLabel}>Título (inglés) <span style={{ fontWeight:400, color:K.taupe }}>— opcional</span></label>
                    <input id={idEn} style={textInput} value={labelEn} placeholder="Si lo dejas vacío, se usa el español" maxLength={80}
                      onChange={e => setDraft(g.id, "labelEn", e.target.value)} onBlur={() => saveCaption(g)} onKeyDown={onKey}/>
                  </div>
                  {dirty && (
                    <button type="button" className="btn-sm" style={{ minHeight:46, fontSize:".8rem", borderRadius:6 }} disabled={locked}
                      onMouseDown={e => e.preventDefault()} onClick={() => saveCaption(g)}>Guardar título</button>
                  )}
                  <div>
                    <label htmlFor={idTag} style={fieldLabel}>Categoría (filtro en la web)</label>
                    <select id={idTag} value={g.tag} disabled={locked} style={{ ...textInput, cursor:"pointer" }}
                      onChange={e => { const tag = e.target.value; const name = GALLERY_TAGS.find(t => t[0] === tag)?.[1]; savePatch(g, { tag }, { tag }, `Categoría: ${name} ✓`); }}>
                      {GALLERY_TAGS.map(([v, es]) => <option key={v} value={v}>{es}</option>)}
                    </select>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".5rem" }}>
                    <button type="button" aria-pressed={g.featured} disabled={locked} style={toggleBtn(g.featured, locked)}
                      onClick={() => savePatch(g, { featured: !g.featured }, { featured: !g.featured }, !g.featured ? "Ahora es foto grande ✓" : "Ya no es foto grande")}>
                      <span aria-hidden="true">{g.featured ? "☑" : "☐"}</span> Foto grande
                    </button>
                    <button type="button" aria-pressed={g.strip} disabled={locked} style={toggleBtn(g.strip, locked)} onClick={() => toggleStrip(g)}>
                      <span aria-hidden="true">{g.strip ? "☑" : "☐"}</span> Franja de portada
                    </button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:".5rem" }}>
                    <button type="button" aria-label={`Mover la foto ${i + 1} arriba`} disabled={locked || i === 0} style={bigBtn(locked || i === 0)} onClick={() => move(i, -1)}>↑ Arriba</button>
                    <button type="button" aria-label={`Mover la foto ${i + 1} abajo`} disabled={locked || i === list.length - 1} style={bigBtn(locked || i === list.length - 1)} onClick={() => move(i, 1)}>↓ Abajo</button>
                    <button type="button" aria-label={`Poner la foto ${i + 1} la primera`} disabled={locked || i === 0} style={bigBtn(locked || i === 0)} onClick={() => moveToTop(i)}>⤒ Primera</button>
                  </div>
                  <button type="button" disabled={locked} style={bigBtn(locked, { color:K.danger, borderColor:"#E8B4B4" })} onClick={() => remove(g)}>🗑 Eliminar foto</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
