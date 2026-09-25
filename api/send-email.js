import {
  serviceClient, sendEmail, esc, oneLine, safeEqual, bearerToken, isAdminToken,
  parseId, UUID_RE, loadRoom, roomName, sendPush,
} from './_lib/shared.js';

// esc() (in _lib/shared.js) wraps every value interpolated into an email template: guest
// names and notes are guest-supplied and must not inject markup into mail from the hotel domain.

const FROM_EMAIL     = process.env.FROM_EMAIL     || 'Caonabo 35 <onboarding@resend.dev>';
const REPLY_TO       = process.env.REPLY_TO       || process.env.ADMIN_EMAIL || '';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'admin@caonabo35.com';
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP  || '';
const BANK_NAME      = process.env.BANK_NAME       || 'Banco Popular';
const BANK_ACCOUNT   = process.env.BANK_ACCOUNT    || '819272006';
const BANK_HOLDER    = process.env.BANK_HOLDER     || 'SHIH I LIU';
const BANK_TYPE      = process.env.BANK_TYPE       || 'Cuenta de Ahorros';

// ── WhatsApp notification via CallMeBot (free) ────────────────────────────
async function sendWhatsApp(message) {
  const phone  = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return;
  try {
    const text = encodeURIComponent(message);
    const r = await fetch(`https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${text}&apikey=${encodeURIComponent(apikey)}`);
    if (!r.ok) console.error('CallMeBot error: HTTP', r.status);
  } catch (e) {
    console.error('CallMeBot error:', e.message);
  }
}

// ── Bank transfer HTML block ──────────────────────────────────────────────
function bankTransferBlock() {
  return `
    <div style="background:#E8F5E9;border-left:4px solid #2E7D32;padding:1.25rem 1.5rem;border-radius:0 6px 6px 0;margin:1.5rem 0;">
      <p style="margin:0 0 .6rem;font-weight:bold;color:#1B5E20;font-size:.95rem;">🏦 Datos para la Transferencia Bancaria</p>
      <p style="margin:0 0 .75rem;font-size:.88rem;color:#2A1F16;line-height:1.6;">
        Para confirmar su habitación, realice una transferencia bancaria con los datos a continuación.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:.9rem;background:#fff;border-radius:6px;overflow:hidden;">
        <tr style="background:#f9f9f9;"><td style="padding:.55rem .75rem;color:#555;width:45%;border-bottom:1px solid #e8f5e9;">Banco</td><td style="padding:.55rem .75rem;font-weight:bold;border-bottom:1px solid #e8f5e9;">${BANK_NAME}</td></tr>
        <tr><td style="padding:.55rem .75rem;color:#555;border-bottom:1px solid #e8f5e9;">Tipo de cuenta</td><td style="padding:.55rem .75rem;font-weight:bold;border-bottom:1px solid #e8f5e9;">${BANK_TYPE}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:.55rem .75rem;color:#555;border-bottom:1px solid #e8f5e9;">Número de cuenta</td><td style="padding:.55rem .75rem;font-weight:bold;color:#1B5E20;font-size:1.05rem;border-bottom:1px solid #e8f5e9;">${BANK_ACCOUNT}</td></tr>
        <tr><td style="padding:.55rem .75rem;color:#555;">A nombre de</td><td style="padding:.55rem .75rem;font-weight:bold;">${BANK_HOLDER}</td></tr>
      </table>
      <p style="margin:.9rem 0 0;font-size:.85rem;color:#2A1F16;">📲 Una vez realizada la transferencia, envíenos el comprobante por WhatsApp${ADMIN_WHATSAPP ? ` al <strong>${ADMIN_WHATSAPP}</strong>` : ''} y su reserva quedará confirmada en menos de 24 horas.</p>
    </div>
  `;
}

const TYPES = ['guest_confirmation', 'admin_notification', 'booking_confirmed'];
const WINDOW_MS = 15 * 60 * 1000;
const SENT_COLUMN = { guest_confirmation: 'confirmation_sent_at', admin_notification: 'admin_notified_at' };

// guest_confirmation / admin_notification: only the browser that just created the booking holds
// its readback_token, only for 15 minutes, and each message goes out at most once.
// booking_confirmed: admins only. Content is always rendered from the DB row; no other request
// field is read.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const raw = req.body && typeof req.body === 'object' ? req.body : {};
  const { type } = raw;
  if (!TYPES.includes(type)) return res.status(400).json({ error: 'Unknown type' });

  const bookingId = parseId(raw.bookingId);
  if (!bookingId) return res.status(400).json({ error: 'Invalid request' });

  let sb;
  try { sb = serviceClient(); } catch { return res.status(500).json({ error: 'Server error' }); }

  if (type === 'booking_confirmed') {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdminToken(sb, token))) return res.status(403).json({ error: 'Forbidden' });
  } else if (typeof raw.readbackToken !== 'string' || !UUID_RE.test(raw.readbackToken)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { data: row, error: rowErr } = await sb.from('bookings')
    .select('id,guest,email,phone,room,check_in,check_out,nights,guests,total,notes,status,created_at,readback_token')
    .eq('id', bookingId).maybeSingle();
  if (rowErr) { console.error('send-email lookup error:', rowErr.message); return res.status(500).json({ error: 'Server error' }); }

  if (type === 'booking_confirmed') {
    if (!row) return res.status(404).json({ error: 'Not found' });
  } else {
    if (!row || !safeEqual(String(row.readback_token || ''), raw.readbackToken)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const age = Date.now() - Date.parse(row.created_at);
    if (!(age >= -60000 && age <= WINDOW_MS)) return res.status(403).json({ error: 'Forbidden' });
  }

  if (type !== 'admin_notification' && !String(row.email || '').trim()) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  // Atomic one-shot claim: only the request that flips the column from NULL sends.
  const sentCol = SENT_COLUMN[type];
  if (sentCol) {
    const { data: claimed, error: claimErr } = await sb.from('bookings')
      .update({ [sentCol]: new Date().toISOString() })
      .eq('id', bookingId).is(sentCol, null)
      .select('id');
    if (claimErr) { console.error('send-email claim error:', claimErr.message); return res.status(500).json({ error: 'Server error' }); }
    if (!claimed || claimed.length === 0) return res.status(200).json({ ok: true, skipped: true });
  }

  const roomRow = await loadRoom(sb, row.room).catch(() => null);
  const booking = {
    id: row.id, guest: esc(row.guest), email: esc(row.email), phone: esc(row.phone),
    checkIn: esc(row.check_in), checkOut: esc(row.check_out),
    nights: Number(row.nights) || 0, guests: Number(row.guests) || 0,
    total: Number(row.total) || 0, notes: esc(row.notes),
  };
  const room = { name: esc(roomName(roomRow, row.room)) };
  const plain = {
    guest: oneLine(row.guest, 120), phone: oneLine(row.phone, 40), room: oneLine(roomName(roomRow, row.room), 80),
    checkIn: oneLine(row.check_in, 10), checkOut: oneLine(row.check_out, 10), notes: oneLine(row.notes, 500),
  };
  const guestTo = String(row.email || '').trim();
  const idem = (kind) => ({ idempotencyKey: `c35-${kind}-${row.id}` });

  try {

    // ── 1. Guest confirmation (booking received) ──────────────────────────
    if (type === 'guest_confirmation') {
      await sendEmail({
        from: FROM_EMAIL,
        replyTo: REPLY_TO || undefined,
        to: guestTo,
        subject: `Reserva recibida – ${room.name} · Caonabo 35`,
        html: `
          <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#2A1F16;">
            <div style="background:#2A1F16;padding:2rem;text-align:center;">
              <h1 style="color:#C4973A;font-size:1.8rem;margin:0;letter-spacing:.1em;">CAONABO 35</h1>
              <p style="color:#E8C97A;font-size:.75rem;letter-spacing:.2em;margin:.3rem 0 0;">SANTO DOMINGO · R.D.</p>
            </div>
            <div style="padding:2.5rem 2rem;background:#FAFAF8;">
              <p style="font-size:1.05rem;">Estimado/a <strong>${booking.guest}</strong>,</p>
              <p style="line-height:1.7;color:#444;">Su solicitud de reserva ha sido recibida. Para confirmar su habitación, realice la transferencia bancaria indicada abajo y envíenos el comprobante respondiendo este correo.</p>
              <div style="background:#fff;border:1px solid #E8C97A;border-radius:8px;padding:1.5rem;margin:1.5rem 0;">
                <h3 style="color:#C4973A;margin:0 0 1rem;font-size:.8rem;letter-spacing:.15em;text-transform:uppercase;">Detalles de su Reserva</h3>
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Habitación</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${room.name}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Check-in</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${booking.checkIn}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Check-out</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${booking.checkOut}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Noches</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${booking.nights}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Huéspedes</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${booking.guests}</td></tr>
                  <tr><td style="padding:.7rem 0 0;color:#666;font-size:.9rem;">Total</td><td style="padding:.7rem 0 0;font-weight:bold;font-size:1.1rem;color:#C4973A;">$${booking.total} USD</td></tr>
                </table>
              </div>
              ${bankTransferBlock()}
              <p style="font-size:.88rem;color:#888;line-height:1.6;margin-top:1rem;">¿Preguntas? Responda este correo. Estamos para servirle.</p>
              <p style="margin-top:1.5rem;">Con gusto le esperamos,<br/><strong>Equipo Caonabo 35</strong></p>
            </div>
            <div style="background:#2A1F16;padding:1rem;text-align:center;">
              <p style="color:#8B6B4E;font-size:.75rem;margin:0;">Av. Caonabo #35, 2do Piso · Santo Domingo, R.D. · caonabo35.com</p>
            </div>
          </div>
        `,
      }, idem('guest-confirmation'));
    }

    // ── 2. Admin notification (new booking) ──────────────────────────────
    if (type === 'admin_notification') {
      const waMsg =
        `🏨 *Nueva reserva – Caonabo 35*\n` +
        `👤 ${plain.guest}\n` +
        `🛏️ ${plain.room}\n` +
        `📅 ${plain.checkIn} → ${plain.checkOut} (${booking.nights} noche${booking.nights>1?'s':''})\n` +
        `👥 ${booking.guests} huésped(es)\n` +
        `💰 $${booking.total} USD\n` +
        `📞 ${plain.phone}` +
        (plain.notes ? `\n📝 ${plain.notes}` : '');

      await sendWhatsApp(waMsg);
      await sendPush(
        `🏨 Nueva reserva – ${plain.room}`,
        `${plain.guest} · ${plain.checkIn} → ${plain.checkOut} · $${booking.total}\nTel: ${plain.phone}`,
        { tags: ['hotel', 'bell'] }
      );
      await sendEmail({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `🔔 Nueva reserva – ${room.name} (${booking.checkIn} → ${booking.checkOut})`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
            <h2 style="color:#C4973A;">Nueva Reserva Recibida</h2>
            <table style="width:100%;border-collapse:collapse;font-size:.95rem;">
              <tr><td style="padding:.4rem 0;color:#666;">Huésped</td><td><strong>${booking.guest}</strong></td></tr>
              <tr><td style="padding:.4rem 0;color:#666;">Email</td><td>${booking.email}</td></tr>
              <tr><td style="padding:.4rem 0;color:#666;">Teléfono</td><td>${booking.phone}</td></tr>
              <tr><td style="padding:.4rem 0;color:#666;">Habitación</td><td><strong>${room.name}</strong></td></tr>
              <tr><td style="padding:.4rem 0;color:#666;">Check-in</td><td>${booking.checkIn}</td></tr>
              <tr><td style="padding:.4rem 0;color:#666;">Check-out</td><td>${booking.checkOut}</td></tr>
              <tr><td style="padding:.4rem 0;color:#666;">Noches</td><td>${booking.nights}</td></tr>
              <tr><td style="padding:.4rem 0;color:#666;">Total</td><td><strong>$${booking.total} USD</strong></td></tr>
              ${booking.notes ? `<tr><td style="padding:.4rem 0;color:#666;">Notas</td><td>${booking.notes}</td></tr>` : ''}
            </table>
            <p style="margin-top:1.5rem;font-size:.85rem;color:#999;">Ingresa al panel de administración para confirmar esta reserva.</p>
          </div>
        `,
      }, idem('admin-notification'));
    }

    // ── 3. Booking confirmed by admin ────────────────────────────────────
    if (type === 'booking_confirmed') {
      await sendEmail({
        from: FROM_EMAIL,
        replyTo: REPLY_TO || undefined,
        to: guestTo,
        subject: `🎉 ¡Reserva confirmada! – ${room.name} · Caonabo 35`,
        html: `
          <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#2A1F16;">
            <div style="background:#2A1F16;padding:2rem;text-align:center;">
              <h1 style="color:#C4973A;font-size:1.8rem;margin:0;letter-spacing:.1em;">CAONABO 35</h1>
              <p style="color:#E8C97A;font-size:.75rem;letter-spacing:.2em;margin:.3rem 0 0;">SANTO DOMINGO · R.D.</p>
            </div>
            <div style="padding:2.5rem 2rem;background:#FAFAF8;">
              <p style="font-size:1.05rem;">Estimado/a <strong>${booking.guest}</strong>,</p>
              <p style="color:#2E7D32;font-weight:bold;font-size:1.05rem;">✅ Su reserva ha sido <u>confirmada</u>. ¡Le esperamos!</p>
              <div style="background:#fff;border:2px solid #C4973A;border-radius:8px;padding:1.5rem;margin:1.5rem 0;">
                <h3 style="color:#C4973A;margin:0 0 1rem;font-size:.8rem;letter-spacing:.15em;text-transform:uppercase;">Detalles de su Reserva</h3>
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Habitación</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${room.name}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Check-in</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${booking.checkIn}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Check-out</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${booking.checkOut}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Noches</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${booking.nights}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Huéspedes</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${booking.guests}</td></tr>
                  <tr><td style="padding:.7rem 0 0;color:#666;font-size:.9rem;">Total</td><td style="padding:.7rem 0 0;font-weight:bold;font-size:1.1rem;color:#C4973A;">$${booking.total} USD</td></tr>
                </table>
              </div>
              <div style="background:#FFF8E1;border-left:4px solid #C4973A;padding:1rem 1.25rem;margin-bottom:1.5rem;border-radius:0 4px 4px 0;">
                <p style="margin:0;font-size:.9rem;font-weight:bold;">Información de llegada</p>
                <p style="margin:.4rem 0 0;font-size:.88rem;color:#555;line-height:1.8;">
                  📍 Av. Caonabo #35, 2do Piso · Santo Domingo, R.D.<br/>
                  🕐 Check-in: a partir de las 3:00 PM<br/>
                  🕑 Check-out: antes de las 12:00 PM
                </p>
              </div>
              <p style="font-size:.88rem;color:#888;">¿Preguntas? Escríbanos por WhatsApp${ADMIN_WHATSAPP ? ` al ${ADMIN_WHATSAPP}` : ''}. ¡Con gusto le atendemos!</p>
              <p style="margin-top:1.5rem;">Con gusto le esperamos,<br/><strong>Equipo Caonabo 35</strong></p>
            </div>
            <div style="background:#2A1F16;padding:1rem;text-align:center;">
              <p style="color:#8B6B4E;font-size:.75rem;margin:0;">Av. Caonabo #35, 2do Piso · Santo Domingo, R.D. · caonabo35.com</p>
            </div>
          </div>
        `,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-email error:', err.message, err.provider || '');
    // Nothing was delivered, so release the one-shot claim; a retry inside the window may send.
    if (sentCol) await sb.from('bookings').update({ [sentCol]: null }).eq('id', bookingId).then(() => {}, () => {});
    return res.status(500).json({ error: 'Email failed' });
  }
}
