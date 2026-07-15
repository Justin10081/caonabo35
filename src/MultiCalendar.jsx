import { useState, useEffect, useMemo, useCallback } from "react";

// Airbnb-style multicalendar: units (rows) × dates (columns), editable per-night price + availability.
// Reads/writes the `room_nights` table (room_id, date, price, available). Falls back to each room's base
// price when a night has no override. Needs the 20260715 migration applied for the table to exist.
const GOLD = "#C4973A", INK = "#2A1F16", CREAM = "#F7F3EE", LINE = "#e8ddcb";
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const WD_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function MultiCalendar({ rooms = [], bookings = [], supabase, showToast, today, seasons = [] }) {
  const [start, setStart] = useState(() => { const t = today ? new Date(today + "T00:00:00") : new Date(); t.setHours(0, 0, 0, 0); return t; });
  const [span, setSpan] = useState(14);
  const [nights, setNights] = useState({});            // `${roomId}|${date}` -> {price, available}
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(null);                 // {roomId, date} being edited
  const [draft, setDraft] = useState({ price: "", available: true });
  const [bulk, setBulk] = useState({ room: "all", from: "", to: "", price: "" });

  const dates = useMemo(() => Array.from({ length: span }, (_, i) => iso(addDays(start, i))), [start, span]);
  const rangeStart = dates[0], rangeEnd = dates[dates.length - 1];

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from("room_nights").select("room_id,date,price,available").gte("date", rangeStart).lte("date", rangeEnd);
    if (error) { showToast?.("⚠️ " + error.message + " — ¿corriste la migración?"); setLoading(false); return; }
    const m = {}; (data || []).forEach(r => { m[`${r.room_id}|${r.date}`] = { price: r.price, available: r.available }; });
    setNights(m); setLoading(false);
  }, [supabase, rangeStart, rangeEnd, showToast]);
  useEffect(() => { load(); }, [load]);

  const basePrice = (room) => room.price ?? room.price_override ?? 0;
  const cell = (roomId, date) => nights[`${roomId}|${date}`];
  // Effective per-night rate that matches what a guest actually pays: manual override wins, then a
  // seasonal date-range rule (same engine as the booking price), then the room's base price.
  const seasonalRate = (room, date) => {
    const base = basePrice(room);
    const ranges = (seasons || []).filter(s => s && s.type === "range" && s.start && s.end && date >= s.start && date <= s.end && (!s.room || s.room === "all" || String(s.room) === String(room.id)));
    if (!ranges.length) return null;
    const specific = ranges.filter(s => s.room && s.room !== "all");
    const pool = specific.length ? specific : ranges;
    const rateOf = s => s.mode === "pct" ? Math.round(base * (1 + (s.pct || 0) / 100)) : (Number(s.price) || base);
    return Math.max(...pool.map(rateOf));
  };
  const effPrice = (room, date) => {
    const c = cell(room.id, date);
    if (c && c.price != null) return c.price;
    const sr = seasonalRate(room, date);
    return sr != null ? sr : basePrice(room);
  };
  const isBlocked = (roomId, date) => cell(roomId, date)?.available === false;
  const bookedSet = useMemo(() => {
    const s = new Set();
    (bookings || []).forEach(b => {
      if (b.status === "cancelled") return;
      const ci = b.checkIn || b.check_in, co = b.checkOut || b.check_out; if (!ci || !co) return;
      for (let d = new Date(ci + "T00:00:00"); iso(d) < co; d = addDays(d, 1)) s.add(`${b.room}|${iso(d)}`);
    });
    return s;
  }, [bookings]);

  async function saveCell() {
    if (!sel || !supabase) return;
    const price = draft.price === "" ? null : Number(draft.price);
    const { error } = await supabase.from("room_nights").upsert({ room_id: String(sel.roomId), date: sel.date, price, available: draft.available }, { onConflict: "room_id,date" });
    if (error) { showToast?.("❌ " + error.message); return; }
    setNights(p => ({ ...p, [`${sel.roomId}|${sel.date}`]: { price, available: draft.available } }));
    setSel(null); showToast?.("Guardado ✓");
  }

  async function applyBulk(mode) {
    if (!supabase) return;
    if (!bulk.from || !bulk.to || bulk.from > bulk.to) { showToast?.("Elige un rango de fechas válido"); return; }
    const targetRooms = bulk.room === "all" ? rooms.map(r => r.id) : [bulk.room];
    const rows = [];
    for (const rid of targetRooms) {
      for (let d = new Date(bulk.from + "T00:00:00"); iso(d) <= bulk.to; d = addDays(d, 1)) {
        const key = `${rid}|${iso(d)}`, existing = nights[key] || {};
        rows.push({
          room_id: String(rid), date: iso(d),
          price: mode === "price" ? (bulk.price === "" ? null : Number(bulk.price)) : (existing.price ?? null),
          available: mode === "block" ? false : mode === "unblock" ? true : (existing.available ?? true),
        });
      }
    }
    if (rows.length > 4000) { showToast?.("Rango demasiado grande"); return; }
    const { error } = await supabase.from("room_nights").upsert(rows, { onConflict: "room_id,date" });
    if (error) { showToast?.("❌ " + error.message); return; }
    showToast?.(`${rows.length} noche(s) actualizada(s) ✓`); load();
  }

  const th = { position: "sticky", top: 0, background: INK, color: CREAM, padding: ".4rem .3rem", fontSize: ".62rem", textAlign: "center", minWidth: 66, fontWeight: 600, zIndex: 2 };
  const nameCell = { position: "sticky", left: 0, background: CREAM, padding: ".4rem .6rem", fontSize: ".72rem", fontWeight: 600, color: INK, whiteSpace: "nowrap", borderRight: `2px solid ${GOLD}`, zIndex: 1 };

  return (
    <div>
      {/* toolbar */}
      <div style={{ display: "flex", gap: ".6rem", alignItems: "center", flexWrap: "wrap", marginBottom: ".9rem" }}>
        <button onClick={() => setStart(s => addDays(s, -7))} style={btn}>‹ Semana</button>
        <button onClick={() => setStart(s => addDays(s, 7))} style={btn}>Semana ›</button>
        <button onClick={() => { const t = today ? new Date(today + "T00:00:00") : new Date(); t.setHours(0, 0, 0, 0); setStart(t); }} style={btn}>Hoy</button>
        <select value={span} onChange={e => setSpan(Number(e.target.value))} style={inp}>
          <option value={14}>14 días</option><option value={21}>21 días</option><option value={30}>30 días</option>
        </select>
        <span style={{ fontSize: ".72rem", color: "#8B6B4E" }}>{rangeStart} → {rangeEnd}{loading ? " · cargando…" : ""}</span>
      </div>

      {/* bulk range editor */}
      <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8, padding: ".7rem .85rem", marginBottom: "1rem" }}>
        <strong style={{ fontSize: ".72rem", color: INK }}>Editar en bloque:</strong>
        <select value={bulk.room} onChange={e => setBulk(b => ({ ...b, room: e.target.value }))} style={inp}>
          <option value="all">Todas</option>
          {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <input type="date" value={bulk.from} onChange={e => setBulk(b => ({ ...b, from: e.target.value }))} style={inp} />
        <span style={{ color: "#999" }}>→</span>
        <input type="date" value={bulk.to} onChange={e => setBulk(b => ({ ...b, to: e.target.value }))} style={inp} />
        <input type="number" placeholder="Precio $" value={bulk.price} onChange={e => setBulk(b => ({ ...b, price: e.target.value }))} style={{ ...inp, width: 90 }} />
        <button onClick={() => applyBulk("price")} style={{ ...btn, background: GOLD, color: "#fff", borderColor: GOLD }}>Fijar precio</button>
        <button onClick={() => applyBulk("block")} style={{ ...btn, color: "#B71C1C", borderColor: "#e0b4b4" }}>Bloquear</button>
        <button onClick={() => applyBulk("unblock")} style={btn}>Desbloquear</button>
      </div>

      {/* grid */}
      <div style={{ overflowX: "auto", border: `1px solid ${LINE}`, borderRadius: 8 }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ ...nameCell, ...th, left: 0, textAlign: "left", minWidth: 130 }}>Habitación</th>
              {dates.map(d => { const dt = new Date(d + "T00:00:00"); const isToday = d === iso(new Date()); return (
                <th key={d} style={{ ...th, background: isToday ? GOLD : INK }}>{WD_ES[dt.getDay()]}<br />{dt.getDate()}/{dt.getMonth() + 1}</th>
              ); })}
            </tr>
          </thead>
          <tbody>
            {rooms.map(room => (
              <tr key={room.id}>
                <td style={nameCell}>{room.name}</td>
                {dates.map(date => {
                  const booked = bookedSet.has(`${room.id}|${date}`);
                  const blocked = isBlocked(room.id, date);
                  const custom = cell(room.id, date)?.price != null;
                  const seasonal = !custom && seasonalRate(room, date) != null;
                  const bg = booked ? "#eceff1" : blocked ? "#fdecea" : custom ? "#fff8ea" : seasonal ? "#eef5ff" : "#fff";
                  return (
                    <td key={date}
                      onClick={() => { if (booked) return; setSel({ roomId: room.id, date }); const c = cell(room.id, date); setDraft({ price: c?.price ?? "", available: c?.available !== false }); }}
                      title={booked ? "Reservada" : blocked ? "Bloqueada" : "Clic para editar"}
                      style={{ borderBottom: `1px solid ${LINE}`, borderRight: `1px solid #f3ece0`, textAlign: "center", padding: ".4rem .2rem", fontSize: ".72rem", cursor: booked ? "not-allowed" : "pointer", background: bg, color: booked ? "#90a4ae" : blocked ? "#B71C1C" : INK, fontWeight: (custom || seasonal) ? 700 : 400 }}>
                      {booked ? "•" : blocked ? "—" : `$${effPrice(room, date)}`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: ".68rem", color: "#8B6B4E", marginTop: ".6rem" }}>
        <span style={{ background: "#fff8ea", padding: "0 .3rem", border: `1px solid ${LINE}` }}>precio propio</span>{" "}
        <span style={{ background: "#eef5ff", padding: "0 .3rem", border: `1px solid ${LINE}` }}>tarifa temporal</span>{" "}
        <span style={{ background: "#fdecea", color: "#B71C1C", padding: "0 .3rem" }}>— bloqueada</span>{" "}
        <span style={{ background: "#eceff1", color: "#90a4ae", padding: "0 .3rem" }}>• reservada</span>{" "}· clic en una celda para el precio de esa noche.
      </p>

      {/* single-cell popover */}
      {sel && (
        <div onClick={() => setSel(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, padding: "1.5rem", width: 300, boxShadow: "0 10px 40px rgba(0,0,0,.25)" }}>
            <div style={{ fontWeight: 700, color: INK, marginBottom: ".2rem" }}>{rooms.find(r => r.id === sel.roomId)?.name}</div>
            <div style={{ fontSize: ".78rem", color: "#8B6B4E", marginBottom: "1rem" }}>{sel.date}</div>
            <label style={{ fontSize: ".72rem", color: "#666" }}>Precio de esta noche ($)</label>
            <input type="number" autoFocus value={draft.price} onChange={e => setDraft(d => ({ ...d, price: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && saveCell()}
              placeholder={`base: $${basePrice(rooms.find(r => r.id === sel.roomId) || {})}`}
              style={{ ...inp, width: "100%", margin: ".3rem 0 1rem", fontSize: "1rem" }} />
            <label style={{ display: "flex", alignItems: "center", gap: ".5rem", fontSize: ".82rem", color: INK, marginBottom: "1.2rem", cursor: "pointer" }}>
              <input type="checkbox" checked={draft.available} onChange={e => setDraft(d => ({ ...d, available: e.target.checked }))} />
              Disponible esta noche
            </label>
            <div style={{ display: "flex", gap: ".5rem" }}>
              <button onClick={saveCell} style={{ ...btn, flex: 1, background: GOLD, color: "#fff", borderColor: GOLD }}>Guardar</button>
              <button onClick={() => setSel(null)} style={{ ...btn, flex: 1 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const btn = { padding: ".4rem .8rem", fontSize: ".72rem", border: `1px solid ${LINE}`, borderRadius: 6, background: "#fff", color: INK, cursor: "pointer" };
const inp = { padding: ".38rem .5rem", fontSize: ".75rem", border: `1px solid ${LINE}`, borderRadius: 6, background: "#fff", color: INK };
