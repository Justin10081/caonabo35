import { useState, useRef, useEffect, useId, createContext, useContext } from "react";
import { supabase } from "./lib/supabase.js";
import MultiCalendar from "./MultiCalendar.jsx";
import { todaySD, addDays, isYmd, validateStay, validateAdminStay, stayErrorText, clampMinNights, nightsBetween, MAX_ADVANCE_DAYS, MAX_NIGHTS } from "./lib/dates.js";
import { nights, fmtMoney, quoteFor, activeRecurringSeason, nightKey } from "./lib/pricing.js";
import { bookingErrorKey, bookingErrorMessage, isOverlapError, ADMIN_OVERLAP_TEXT } from "./lib/bookingErrors.js";
import { hasBookingConflict, blockedNights, channelNights, CHANNEL_OF_SOURCE } from "./lib/availability.js";
import { isRev, isOta, OTA_RATE, BOOKING_SOURCES, STATUS_OPTIONS, channelBreakdown, otaCommission as otaCommissionOf, bookingTotals, mapBookingRow, bookingsChanged } from "./lib/admin.js";
import { waDigits, isWaNumber, formatWa, waLinkFor } from "./lib/phone.js";
import { escapeHtml, isSafeImageDataUrl, openImageWindow } from "./lib/html.js";
import { compressImage, compressToBlob } from "./lib/image.js";
import { useDialog } from "./lib/dialog.js";

const I = {
  terrace: "/img/terrace.jpg",
  living1: "/img/living1.jpg",
  artBench: "/img/artBench.jpg",
  livingWide: "/img/livingWide.jpg",
  mirror: "/img/mirror.jpg",
  plantDetail: "/img/plantDetail.jpg",
  livingBig: "/img/livingBig.jpg",
  reception: "/img/reception.jpg",
  lobby: "/img/lobby.jpg",
  corridor: "/img/corridor.jpg",
  tvRoom: "/img/tvRoom.jpg",
  amberChairs: "/img/amberChairs.jpg",
  bathroom: "/img/bathroom.jpg",
  facade: "/img/facade.jpg",
  greenBed: "/img/greenBed.jpg",
  rainShower: "/img/rainShower.jpg",
  plants: "/img/plants.jpg",
  chessRoom: "/img/chessRoom.jpg",
  sofaClose: "/img/sofaClose.jpg",
  chess: "/img/chess.jpg",
  room201Bed: "/img/room201Bed.jpg",
  room201Bath: "/img/room201Bath.jpg",
  room202Bed: "/img/room202Bed.jpg",
  room202Bath: "/img/room202Bath.jpg",
  room203Bed: "/img/room203Bed.jpg",
  room203Bath: "/img/room203Bath.jpg",
  room205Bed: "/img/room205Bed.jpg",
  room205Bath: "/img/room205Bath.jpg",
  room206Bed: "/img/room206Bed.jpg",
  room206Bath: "/img/room206Bath.jpg",
  room207Bed: "/img/room207Bed.jpg",
  room207Bath: "/img/room207Bath.jpg",
  room208Bed: "/img/room208Bed.jpg",
  room208Bath: "/img/room208Bath.jpg",
};

const C = {
  ivory:"#F7F3EE", parchment:"#EDE6D9", sand:"#D4C5B0", taupe:"#B8A898",
  warm:"#8B6B4E", mahogany:"#5C3D2E", ebony:"#2A1F16",
  gold:"#C4973A", goldLight:"#E8C97A", olive:"#6B7A5A",
  // Text-only shades that pass WCAG AA on the light backgrounds (gold stays for accents/borders/buttons)
  goldText:"#8A6420", goldTextDeep:"#7A5818", taupeText:"#756657",
  smoke:"#F0EDE8", white:"#FFFFFF",
  success:"#2e7d32", successBg:"#e8f5e9",
  warning:"#e65100", warningBg:"#fff8e1",
  danger:"#c62828", dangerBg:"#fce4ec",
};

// ─── ADMIN PASSWORD (change this to your real password) ───────────────

const ROOMS_INIT = [
  {id:1,name:"Habitación 201",nameEn:"Room 201",beds:"Queen",guests:2,price:90,discount:0,size:"30m²",available:true,bedroom:I.room201Bed,bathroom:I.room201Bath,amenities:["AC","Smart TV","Rain Shower"],desc:"Habitación cómoda y elegante con baño privado."},
  {id:2,name:"Habitación 202",nameEn:"Room 202",beds:"Queen",guests:2,price:75,discount:0,size:"28m²",available:true,bedroom:I.room202Bed,bathroom:I.room202Bath,amenities:["AC","Smart TV","Rain Shower"],desc:"Espacio acogedor con diseño moderno y todas las comodidades."},
  {id:3,name:"Habitación 203",nameEn:"Room 203",beds:"Queen",guests:2,price:90,discount:0,size:"30m²",available:true,bedroom:I.room203Bed,bathroom:I.room203Bath,amenities:["AC","Smart TV","Rain Shower"],desc:"Amplia y luminosa, perfecta para una estadía relajada."},
  {id:4,name:"Habitación 205",nameEn:"Room 205",beds:"Double",guests:2,price:75,discount:0,size:"28m²",available:true,bedroom:I.room205Bed,bathroom:I.room205Bath,amenities:["AC","Smart TV"],desc:"Confortable habitación con acabados de calidad."},
  {id:5,name:"Habitación 206",nameEn:"Room 206",beds:"Double",guests:2,price:75,discount:0,size:"28m²",available:true,bedroom:I.room206Bed,bathroom:I.room206Bath,amenities:["AC","Smart TV"],desc:"Diseño refinado con orientación privilegiada."},
  {id:6,name:"Habitación 207",nameEn:"Room 207",beds:"Double",guests:2,price:60,discount:0,size:"25m²",available:true,bedroom:I.room207Bed,bathroom:I.room207Bath,amenities:["AC","Smart TV"],desc:"Habitación acogedora a un precio accesible."},
  {id:7,name:"Habitación 208",nameEn:"Room 208",beds:"Double",guests:2,price:60,discount:0,size:"25m²",available:true,bedroom:I.room208Bed,bathroom:I.room208Bath,amenities:["AC","Smart TV"],desc:"Ideal para estadías cortas con todas las comodidades esenciales."},
];

const BOOKINGS_INIT = [
  {id:1,guest:"María García",email:"maria@email.com",phone:"+1-809-555-0101",room:1,checkIn:"2026-03-26",checkOut:"2026-03-29",guests:2,status:"confirmed",total:360,paid:true,source:"Direct",notes:"Celebración de aniversario"},
  {id:2,guest:"James Wilson",email:"jwilson@email.com",phone:"+1-212-555-0187",room:3,checkIn:"2026-03-28",checkOut:"2026-04-02",guests:2,status:"confirmed",total:750,paid:true,source:"Airbnb",notes:"Late check-in requested"},
  {id:3,guest:"Carlos Méndez",email:"c.mendez@email.com",phone:"+1-809-555-0234",room:2,checkIn:"2026-04-01",checkOut:"2026-04-03",guests:1,status:"pending",total:190,paid:false,source:"Direct",notes:""},
  {id:4,guest:"Sophie Laurent",email:"slaurent@email.com",phone:"+33-612-345-678",room:7,checkIn:"2026-04-05",checkOut:"2026-04-10",guests:3,status:"confirmed",total:900,paid:true,source:"Booking.com",notes:"Needs airport transfer"},
  {id:5,guest:"Ana Rodríguez",email:"ana.r@email.com",phone:"+1-809-555-0312",room:6,checkIn:"2026-04-08",checkOut:"2026-04-10",guests:2,status:"confirmed",total:220,paid:false,source:"Direct",notes:""},
  {id:6,guest:"Michael Chen",email:"mchen@email.com",phone:"+1-646-555-0156",room:4,checkIn:"2026-03-27",checkOut:"2026-03-30",guests:2,status:"cancelled",total:240,paid:false,source:"Direct",notes:"Cancelled by guest"},
  {id:7,guest:"Lara Martínez",email:"lara@email.com",phone:"+1-809-555-0422",room:6,checkIn:"2026-07-15",checkOut:"2026-07-18",guests:2,status:"confirmed",total:330,paid:true,source:"Direct",notes:""},
  {id:8,guest:"Pierre Dupont",email:"pierre@email.com",phone:"+33-700-123-456",room:3,checkIn:"2026-06-10",checkOut:"2026-06-15",guests:2,status:"confirmed",total:750,paid:true,source:"Airbnb",notes:""},
  {id:9,guest:"Isabella Rossi",email:"isa@email.com",phone:"+39-320-456-789",room:1,checkIn:"2026-08-20",checkOut:"2026-08-25",guests:2,status:"confirmed",total:600,paid:false,source:"Direct",notes:"Luna de miel"},
  {id:10,guest:"Omar Al-Rashid",email:"omar@email.com",phone:"+971-50-123",room:7,checkIn:"2026-12-22",checkOut:"2026-12-27",guests:4,status:"confirmed",total:900,paid:true,source:"Booking.com",notes:"Vacaciones fin de año"},
];

const MESSAGES_INIT = [
  {id:1,guest:"James Wilson",email:"jwilson@email.com",phone:"+1-212-555-0187",message:"What time is check-in? We arrive at 11pm.",date:"2026-03-24",read:false},
  {id:2,guest:"Sophie Laurent",email:"slaurent@email.com",phone:"+33-612-345-678",message:"Bonjour! Can you arrange airport pickup from SDQ?",date:"2026-03-23",read:false},
  {id:3,guest:"Ana Rodríguez",email:"ana.r@email.com",phone:"+1-809-555-0312",message:"Hola, ¿tienen estacionamiento disponible para dos carros?",date:"2026-03-22",read:true},
];

const EXPENSES_INIT = [
  {id:1,date:"2026-03-20",category:"Limpieza",desc:"Servicio semanal",amount:150,paid:true},
  {id:2,date:"2026-03-22",category:"Mantenimiento",desc:"Reparación AC Suite 3",amount:80,paid:true},
  {id:3,date:"2026-03-24",category:"Suministros",desc:"Amenidades huéspedes",amount:120,paid:false},
  {id:4,date:"2026-03-25",category:"Servicios",desc:"Internet fibra óptica mensual",amount:65,paid:true},
  {id:5,date:"2026-03-25",category:"Marketing",desc:"Fotografía profesional",amount:200,paid:false},
];

const REVIEWS_INIT = [
  {id:1,guest:"Sarah M.",country:"EE.UU.",rating:5,date:"Mar 2026",approved:true,text:"Absolutely stunning property. The design is magazine-worthy and the service was impeccable. Felt like a luxury boutique hotel."},
  {id:2,guest:"Pablo R.",country:"R.D.",rating:5,date:"Feb 2026",approved:true,text:"El lugar más bonito que he visto en Santo Domingo. La terraza de noche es mágica. Volvería mil veces."},
  {id:3,guest:"Emma T.",country:"Reino Unido",rating:5,date:"Feb 2026",approved:true,text:"The plants, the artwork, the furniture — everything is curated with such taste. Best stay in the DR."},
  {id:4,guest:"Diego F.",country:"Argentina",rating:4,date:"Ene 2026",approved:true,text:"Decoración increíble y muy limpio. El baño tipo spa fue lo mejor. Altamente recomendado."},
  {id:5,guest:"Claire D.",country:"Francia",rating:5,date:"Ene 2026",approved:false,text:"Magnifique! Le couloir avec les plantes suspendues est une oeuvre d art. Nous reviendrons."},
];

const SETTINGS_INIT = {
  propName:"Caonabo 35",
  address:"Av. Caonabo #35, 2do Piso\nSanto Domingo, República Dominicana",
  phone:"+1 (809) 603-3038",whatsapp:"18096033038",email:"liu.luis@me.com",
  checkIn:"3:00 PM",checkOut:"12:00 PM",instagram:"@caonabo35",
  heroSubtitle:"Diseño contemporáneo. Hospitalidad dominicana. Siete habitaciones únicas con alma.",
  minNights:1,taxRate:18,currency:"USD",
};

// Gallery tags must each match a filter below. "bedroom" photos are the rooms'
// current cover photos (from the DB), added at render time.
const GALLERY = [
  {photo:I.terrace,label:"Terraza Exterior",labelEn:"Outdoor Terrace",tag:"outdoor",featured:true},
  {photo:I.livingBig,label:"Sala Principal",labelEn:"Main Lounge",tag:"living",featured:true},
  {photo:I.artBench,label:"Arte & Galería",labelEn:"Art & Gallery",tag:"detail",featured:false},
  {photo:I.livingWide,label:"Sala Panorámica",labelEn:"Panoramic Lounge",tag:"living",featured:true},
  {photo:I.mirror,label:"Espejo de Diseño",labelEn:"Designer Mirror",tag:"detail",featured:false},
  {photo:I.reception,label:"Recepción",labelEn:"Reception",tag:"common",featured:true},
  {photo:I.corridor,label:"Corredor Verde",labelEn:"Green Corridor",tag:"outdoor",featured:true},
  {photo:I.tvRoom,label:"Sala de Estar",labelEn:"Sitting Room",tag:"living",featured:false},
  {photo:I.amberChairs,label:"Lounge Ámbar",labelEn:"Amber Lounge",tag:"common",featured:false},
  {photo:I.bathroom,label:"Baño en Mármol",labelEn:"Marble Bathroom",tag:"bathroom",featured:true},
  {photo:I.facade,label:"Fachada Caonabo 35",labelEn:"Caonabo 35 Façade",tag:"outdoor",featured:true},
  {photo:I.rainShower,label:"Ducha tipo lluvia",labelEn:"Rain Shower",tag:"bathroom",featured:true},
  {photo:I.plants,label:"Jardín Interior",labelEn:"Indoor Garden",tag:"outdoor",featured:false},
  {photo:I.chessRoom,label:"Zona de Juegos",labelEn:"Games Area",tag:"living",featured:false},
];

const AMENITY_CATS = [["Espacios","Spaces"],["Servicios","Services"]];
const AMENITIES = [
  {cat:"Espacios",name:"Terraza Privada",nameEn:"Private Terrace",photo:I.terrace,desc:"Terraza exterior con mobiliario de teca, iluminación de cuerda y vistas abiertas a la ciudad. Perfecta al anochecer.",descEn:"Outdoor terrace with teak furniture, string lighting and open city views. Perfect at dusk."},
  {cat:"Espacios",name:"Jardín Interior",nameEn:"Indoor Garden",photo:I.plants,desc:"Vegetación tropical seleccionada: bambú, ficus y pothos en macetas de cemento artesanal.",descEn:"Hand-picked tropical greenery: bamboo, ficus and pothos in handmade cement planters."},
  {cat:"Espacios",name:"Lobby de Arte",nameEn:"Art Lobby",photo:I.lobby,desc:"Recepción con piezas de arte contemporáneo dominicano, consola de mármol e iluminación arquitectónica.",descEn:"A reception with contemporary Dominican art, a marble console and architectural lighting."},
  {cat:"Servicios",name:"Concierge 24/7",nameEn:"24/7 Concierge",photo:I.reception,desc:"Equipo disponible para traslados, reservas de restaurantes y actividades locales.",descEn:"Our team can arrange transfers, restaurant reservations and local activities."},
  {cat:"Servicios",name:"Estacionamiento",nameEn:"Private Parking",photo:I.facade,desc:"Estacionamiento privado y vigilado para todos los huéspedes, sin costo adicional.",descEn:"Private, supervised parking for all guests at no extra cost."},
  {cat:"Servicios",name:"WiFi Fibra Óptica",nameEn:"Fiber Optic WiFi",photo:I.corridor,desc:"Conexión de fibra óptica simétrica de alta velocidad en todo el edificio.",descEn:"High-speed symmetrical fiber connection throughout the building."},
];

// Display labels for values stored in English in the rooms table. Anything the
// owner adds that isn't listed here is shown exactly as stored.
const BED_LABELS = {Queen:["Cama Queen","Queen bed"],King:["Cama King","King bed"],Double:["Cama doble","Double bed"],Twin:["Dos camas","Twin beds"],Single:["Cama individual","Single bed"]};
const AMENITY_LABELS = {"AC":["Aire acondicionado","Air conditioning"],"Smart TV":["Smart TV","Smart TV"],"Rain Shower":["Ducha tipo lluvia","Rain shower"],"WiFi":["WiFi","WiFi"]};
const PHOTO_LABELS_EN = {"Dormitorio":"Bedroom","Baño":"Bathroom"};
const HERO_SUBTITLE_EN = "Contemporary design. Dominican hospitality. Seven unique rooms with soul.";
const STATUS_LABELS = {
  confirmed:["✅ Confirmada","✅ Confirmed"],
  pending:["⏳ Pendiente de confirmación","⏳ Awaiting confirmation"],
  checked_in:["🏨 En el hotel","🏨 Checked in"],
  finalizada:["✓ Estadía finalizada","✓ Stay completed"],
  cancelled:["❌ Cancelada","❌ Cancelled"],
};
const PAYPAL_ON = !!import.meta.env.VITE_PAYPAL_CLIENT_ID;

// ─── Privacy Policy ───────────────────────────────────────────────────
const PRIVACY_POLICY_ES = `POLÍTICA DE PRIVACIDAD — CAONABO 35

Última actualización: 2026

1. DATOS QUE RECOPILAMOS
Al realizar una reserva, recopilamos: nombre completo, correo electrónico, número de teléfono, número de documento de identidad (cédula o pasaporte) y foto del documento.

2. USO DE LOS DATOS
Sus datos se utilizan exclusivamente para: gestionar su reserva, comunicarnos con usted sobre su estadía, y cumplir con requisitos legales de registro hotelero en la República Dominicana.

3. ALMACENAMIENTO
Sus datos se almacenan de forma segura en servidores protegidos. Las fotos de identidad se guardan de manera encriptada y son accesibles únicamente por el personal autorizado del hotel.

4. DERECHOS
Usted tiene derecho a solicitar acceso, corrección o eliminación de sus datos personales escribiendo a caonabo35@gmail.com.

5. NO COMPARTIMOS
No vendemos, alquilamos ni compartimos sus datos personales con terceros, excepto cuando sea requerido por la ley dominicana.

6. CONTACTO
Para cualquier consulta sobre privacidad: caonabo35@gmail.com`;
const PRIVACY_POLICY_EN = `PRIVACY POLICY — CAONABO 35

Last updated: 2026

1. DATA WE COLLECT
When you make a booking, we collect: full name, email address, phone number, identity document number (cédula or passport) and a photo of the document.

2. HOW WE USE YOUR DATA
Your data is used exclusively to: manage your booking, communicate with you about your stay, and comply with hotel registration legal requirements in the Dominican Republic.

3. STORAGE
Your data is stored securely on protected servers. Identity photos are stored in encrypted form and are accessible only to authorized hotel staff.

4. YOUR RIGHTS
You have the right to request access to, correction of, or deletion of your personal data by writing to caonabo35@gmail.com.

5. WE DON'T SHARE
We do not sell, rent or share your personal data with third parties, except when required by Dominican law.

6. CONTACT
For any privacy question: caonabo35@gmail.com`;

// ─── Helpers ──────────────────────────────────────────────────────────
// ── Room photos ───────────────────────────────────────────────────────────
// Photos live in Supabase Storage (bucket `room-photos`) as an ordered list on
// rooms.photos, so the owner can change them from the admin without a redeploy.
// A room the owner has never touched falls back to the two photos bundled with
// the app, so nothing goes blank during the transition.
const PHOTO_BUCKET = "room-photos";
const DEFAULT_LABELS = ["Dormitorio","Baño"];
function roomPhotos(room){
  const saved = Array.isArray(room?.photos) ? room.photos.filter(p=>p&&p.url) : [];
  if(saved.length) return saved.map((p,i)=>({url:p.url,label:p.label||`Foto ${i+1}`,path:p.path}));
  return [room?.bedroom,room?.bathroom]
    .map((url,i)=>url?{url,label:DEFAULT_LABELS[i]}:null)
    .filter(Boolean);
}
const coverPhoto = (room) => roomPhotos(room)[0]?.url || "";

const ROOM_COLORS = ["#8B6B4E","#5C3D2E","#6B7A5A","#C4973A","#1565C0","#7B1FA2","#C62828"];
const MONTH_NAMES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTH_NAMES_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_IN_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31];
const isLeap = y => (y%4===0&&y%100!==0)||y%400===0;
const daysInMonth = (m,y) => m===1&&isLeap(y)?29:DAYS_IN_MONTH[m];
const firstWeekday = (m,y) => new Date(y,m,1).getDay();
const fmtDate = (y,m,d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

// ─── CSS ──────────────────────────────────────────────────────────────
const css = `
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
@keyframes scaleIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
@keyframes spin{to{transform:rotate(360deg)}}
.fadein{animation:fadeUp .6s ease both}.scalein{animation:scaleIn .3s ease both}
.btn-gold{background:#C4973A;color:#2A1F16;border:none;padding:.82rem 2.2rem;font-family:'Lato',sans-serif;font-size:.74rem;font-weight:700;letter-spacing:.17em;text-transform:uppercase;cursor:pointer;transition:all .18s ease;display:inline-flex;align-items:center;gap:.5rem;justify-content:center}
.btn-gold:hover{background:#E8C97A;transform:translateY(-1px) scale(1.02);box-shadow:0 6px 20px rgba(196,151,58,.35)}.btn-gold:disabled{opacity:.4;cursor:not-allowed;transform:none}
.btn-out{background:transparent;color:#C4973A;border:1px solid #C4973A;padding:.75rem 1.8rem;font-family:'Lato',sans-serif;font-size:.74rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:all .18s ease;display:inline-flex;align-items:center;gap:.5rem;justify-content:center}
.btn-out:hover{background:#C4973A;color:#2A1F16;transform:scale(1.02);box-shadow:0 4px 14px rgba(196,151,58,.28)}
.btn-sm{background:#C4973A;color:#2A1F16;border:none;padding:.4rem 1rem;font-family:'Lato',sans-serif;font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:all .18s ease}
.btn-sm:hover{background:#E8C97A;transform:scale(1.02);box-shadow:0 3px 10px rgba(196,151,58,.3)}
.btn-sm-o{background:transparent;color:#C4973A;border:1px solid rgba(196,151,58,.6);padding:.38rem .9rem;font-family:'Lato',sans-serif;font-size:.67rem;font-weight:600;letter-spacing:.09em;text-transform:uppercase;cursor:pointer;transition:all .18s ease}
.btn-sm-o:hover{background:#C4973A;color:#2A1F16;border-color:#C4973A;transform:scale(1.02)}
.btn-danger{background:#c62828;color:#fff;border:none;padding:.38rem .85rem;font-family:'Lato',sans-serif;font-size:.67rem;font-weight:700;cursor:pointer;transition:all .18s ease}
.btn-danger:hover{opacity:.88;transform:scale(1.02);box-shadow:0 3px 10px rgba(198,40,40,.35)}
.btn-success{background:#2e7d32;color:#fff;border:none;padding:.38rem .85rem;font-family:'Lato',sans-serif;font-size:.67rem;font-weight:700;cursor:pointer;transition:all .18s ease}
.btn-success:hover{opacity:.88;transform:scale(1.02);box-shadow:0 3px 10px rgba(46,125,50,.35)}
.nav-lnk{font-family:'Lato',sans-serif;font-size:.71rem;letter-spacing:.15em;text-transform:uppercase;cursor:pointer;padding:.3rem 0;border-bottom:1px solid transparent;transition:all .2s;color:#B8A898;text-decoration:none;display:inline-flex;align-items:center;min-height:44px}
.nav-lnk:hover{color:#C4973A;border-bottom-color:#C4973A}
.c35-nav{background:#2A1F16;padding:0 2.5rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200;gap:1rem;min-height:72px}
.nav-logo{display:flex;flex-direction:column;justify-content:center;padding:.7rem 0;text-decoration:none;min-height:44px}
.nav-logo-name{color:#C4973A;font-size:1.35rem;font-weight:600;letter-spacing:.12em;line-height:1.15}
.nav-logo-sub{color:#B8A898;font-size:.55rem;font-family:'Lato',sans-serif;letter-spacing:.25em;text-transform:uppercase}
.nav-desk{display:flex;gap:1.6rem;align-items:center}
.nav-mob{display:none;align-items:center;gap:.35rem}
.nav-lang{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;color:#D4C5B0;font-family:'Lato',sans-serif;font-size:.72rem;letter-spacing:.12em;text-decoration:none}
.nav-desk .nav-lang{border-left:1px solid rgba(92,61,46,.6);padding-left:1.1rem}
.nav-lang:hover{color:#E8C97A}
.nav-mine{min-height:44px;padding:0 1rem;background:#F0EDE8;color:#2A1F16;border:1px solid #D4C5B0;font-family:'Lato',sans-serif;font-size:.68rem;letter-spacing:.12em;cursor:pointer}
.nav-mine:hover{background:#fff}
.nav-burger{width:44px;height:44px;background:none;border:1px solid rgba(196,151,58,.45);color:#E8C97A;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:1.25rem;line-height:1}
.nav-menu{position:absolute;top:100%;left:0;right:0;background:#2A1F16;border-top:1px solid rgba(92,61,46,.6);box-shadow:0 14px 30px rgba(0,0,0,.35);padding:.25rem 1rem 1rem;display:flex;flex-direction:column}
.nav-menu a,.nav-menu button{display:flex;align-items:center;width:100%;min-height:48px;padding:0 .4rem;color:#EDE6D9;font-family:'Lato',sans-serif;font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;background:none;border:none;border-bottom:1px solid rgba(92,61,46,.45);text-align:left;cursor:pointer}
.nav-menu a:hover,.nav-menu button:hover{color:#E8C97A}
@media(min-width:961px){.nav-menu{display:none}}
.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
.skip-link{position:absolute;left:1rem;top:-120px;z-index:10000;background:#C4973A;color:#2A1F16;padding:.8rem 1.2rem;font-family:'Lato',sans-serif;font-weight:700;font-size:.8rem;text-decoration:none}
.skip-link:focus{top:.75rem}
#rooms,#gallery,#amenities,#reviews,#contact{scroll-margin-top:80px}
a.btn-gold,a.btn-out{text-decoration:none}
.btn-out.lt{color:#8A6420;border-color:#8A6420}.btn-out.lt:hover{background:#8A6420;color:#fff;border-color:#8A6420}
.room-card{background:#fff;overflow:hidden;transition:transform .3s,box-shadow .3s;box-shadow:0 2px 20px rgba(42,31,22,.07)}
.rm-photo{display:block;width:100%;height:100%;padding:0;border:0;background:#EDE6D9;cursor:zoom-in}
.rm-ovr{pointer-events:none}.rm-ovr .btn-gold{pointer-events:none}
.gal-item{overflow:hidden;cursor:pointer;position:relative;display:block;width:100%;padding:0;border:0;background:#1A0F08}
.gal-item img{width:100%;height:100%;object-fit:cover;transition:transform .4s}
.gal-item:focus-visible .gal-cap{opacity:1!important}
.am-row{display:flex;align-items:center;gap:1.5rem;padding:1.2rem 1.75rem;background:#fff;border:0;border-bottom:1px solid #EDE6D9;cursor:pointer;transition:background .18s;width:100%;font:inherit;color:inherit;text-align:left}
.am-row:last-child{border-bottom:none}.am-row:hover,.am-row:focus-visible{background:#F7F3EE}
.am-row:hover .am-arr,.am-row:focus-visible .am-arr{opacity:1!important;transform:translateX(4px)!important}
.skel{background:linear-gradient(90deg,#EDE6D9 25%,#F7F3EE 50%,#EDE6D9 75%);background-size:200% 100%;animation:skel 1.4s ease infinite}
@keyframes skel{to{background-position:-200% 0}}
.id-drop:focus-within{outline:3px solid #8A6420;outline-offset:2px}
.fld-err{color:#c62828;font-family:'Lato',sans-serif;font-size:.74rem;margin-top:.3rem;line-height:1.4}
.bk-sec{border-top:1px solid #EDE6D9;padding-top:1.1rem;margin-top:1.1rem}
.bk-sec-h{font-family:'Lato',sans-serif;font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:#5C3D2E;font-weight:700;margin-bottom:.85rem}
.gal-dots{display:flex;flex-wrap:wrap;justify-content:center;flex:1;min-width:0}
.gal-dot{width:44px;height:44px;padding:0;border:0;background:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.gal-dot span{width:8px;height:8px;border-radius:50%;display:block}
.foot-lnk{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:0 .35rem;color:#B8A898;font-family:'Lato',sans-serif;font-size:.74rem;text-decoration:none;background:none;border:none;cursor:pointer}
.foot-lnk:hover{color:#E8C97A}
.wa-fab{position:fixed;bottom:1.3rem;right:1.3rem;z-index:1500;display:flex;align-items:center;gap:.5rem;background:#1B7F46;color:#fff;padding:.72rem 1.15rem;border-radius:999px;font-family:'Lato',sans-serif;font-weight:700;font-size:.82rem;text-decoration:none;box-shadow:0 6px 22px rgba(0,0,0,.3);min-height:48px}
.h1-sub{display:block;font-family:'Lato',sans-serif;font-size:clamp(.62rem,1.6vw,.78rem);font-weight:400;font-style:normal;letter-spacing:.34em;text-transform:uppercase;color:#D4C5B0;margin-top:1.1rem;line-height:1.6}
@media (hover:hover){
  .room-card:hover{transform:translateY(-5px);box-shadow:0 16px 48px rgba(42,31,22,.16)}
  .room-card:hover .rm-ovr{opacity:1!important}
  .room-card:hover .rm-ovr .btn-gold{pointer-events:auto}
  .gal-item:hover img{transform:scale(1.06)}
  .gal-item:hover .gal-cap{opacity:1!important}
}
.sb{display:block;padding:.75rem 1.4rem;font-family:'Lato',sans-serif;font-size:.76rem;letter-spacing:.07em;cursor:pointer;border-left:2px solid transparent;transition:all .16s;color:#D4C5B0;white-space:nowrap}
.sb:hover,.sb.act{color:#C4973A;border-left-color:#C4973A;background:rgba(196,151,58,.07)}
.tr{transition:background .12s ease}.tr:hover{background:#EDE6D9!important;cursor:pointer}
.inp{width:100%;padding:.7rem 1rem;border:1px solid #D4C5B0;font-size:.88rem;font-family:'Lato',sans-serif;background:#F0EDE8;outline:none;transition:border-color .15s ease,box-shadow .15s ease;color:#2A1F16}
.inp:focus{border-color:#C4973A;box-shadow:0 0 0 3px rgba(196,151,58,.15)}
.inp:focus-visible,.sel:focus-visible{outline:2px solid #8A6420;outline-offset:1px}
.inp[aria-invalid="true"]{border-color:#c62828;background:#fff5f5}
.inp.error{border-color:#c62828;background:#fff5f5}
.sel{width:100%;padding:.7rem 1rem;border:1px solid #D4C5B0;font-size:.88rem;font-family:'Lato',sans-serif;background:#F0EDE8;color:#2A1F16;transition:border-color .15s ease,box-shadow .15s ease;outline:none}
.sel:focus{border-color:#C4973A;box-shadow:0 0 0 3px rgba(196,151,58,.15)}
.tog{min-height:44px;padding:.42rem 1rem;font-family:'Lato',sans-serif;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;border:1px solid rgba(196,151,58,.35);background:transparent;color:#B8A898;transition:all .15s ease}
.tog.act,.tog:hover{background:#C4973A;color:#2A1F16;border-color:#C4973A}
.stat{background:#fff;padding:1.35rem;border-top:3px solid}
.stat-v{font-size:1.9rem;font-weight:700;line-height:1}
.stat-l{font-family:'Lato',sans-serif;font-size:.63rem;letter-spacing:.11em;text-transform:uppercase;color:#B8A898;margin-top:.35rem}
.card{background:#fff;box-shadow:0 1px 6px rgba(42,31,22,.06);transition:box-shadow .2s ease}
.field-label{display:block;font-size:.62rem;font-family:'Lato',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#8B6B4E;font-weight:600;margin-bottom:.38rem}
.badge-confirmed{background:#e8f5e9;color:#2e7d32;padding:.17rem .65rem;border-radius:20px;font-size:.66rem;font-family:'Lato',sans-serif;font-weight:700;display:inline-block}
.badge-pending{background:#fff8e1;color:#e65100;padding:.17rem .65rem;border-radius:20px;font-size:.66rem;font-family:'Lato',sans-serif;font-weight:700;display:inline-block}
.badge-cancelled{background:#fce4ec;color:#c62828;padding:.17rem .65rem;border-radius:20px;font-size:.66rem;font-family:'Lato',sans-serif;font-weight:700;display:inline-block}
.toast{position:fixed;bottom:2rem;right:2rem;background:#2A1F16;color:#E8C97A;padding:.9rem 1.6rem;font-family:'Lato',sans-serif;font-size:.82rem;z-index:9000;box-shadow:0 8px 30px rgba(0,0,0,.3);animation:scaleIn .3s ease;border-left:3px solid #C4973A}
.error-banner{background:#fce4ec;border:1px solid #ef9a9a;color:#c62828;padding:.7rem 1rem;font-family:'Lato',sans-serif;font-size:.82rem;border-radius:4px;margin-bottom:1rem}
.success-banner{background:#e8f5e9;border:1px solid #a5d6a7;color:#2e7d32;padding:.7rem 1rem;font-family:'Lato',sans-serif;font-size:.82rem;border-radius:4px}
.price-breakdown{background:#F7F3EE;border:1px solid #EDE6D9;padding:1rem 1.25rem;margin:1rem 0}
.price-row{display:flex;justify-content:space-between;font-family:'Lato',sans-serif;font-size:.83rem;padding:.25rem 0}
.price-row.total{border-top:1px solid #D4C5B0;margin-top:.4rem;padding-top:.65rem;font-weight:700;font-size:.97rem}
.day-cell{min-height:32px;padding:3px;cursor:pointer;transition:all .15s;border-radius:3px;display:flex;flex-direction:column;gap:1px}
.day-cell:hover{transform:scale(1.1);z-index:5;position:relative;box-shadow:0 4px 12px rgba(0,0,0,.15)}
.chip{font-size:.5rem;font-family:'Lato',sans-serif;padding:1px 3px;border-radius:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;line-height:1.5;cursor:pointer}
*:focus-visible{outline:3px solid #C4973A;outline-offset:2px}
.lt :focus-visible{outline-color:#8A6420}
[role="dialog"]:focus{outline:none}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
::-webkit-scrollbar{width:7px;height:7px}::-webkit-scrollbar-track{background:#F0EDE8}::-webkit-scrollbar-thumb{background:#C4973A;border-radius:4px}::-webkit-scrollbar-thumb:hover{background:#E8C97A}
@media(max-width:960px){
  .c35-nav{padding:0 1rem;min-height:56px;height:56px}
  .nav-desk{display:none}
  .nav-mob{display:flex}
  .nav-logo{padding:0}
  .nav-logo-name{font-size:1.12rem}
  .nav-logo-sub{font-size:.5rem;letter-spacing:.2em}
  #rooms,#gallery,#amenities,#reviews,#contact{scroll-margin-top:64px}
}
@media(max-width:768px){
  .wa-label{display:none}
  .wa-fab{padding:.8rem;width:52px;height:52px;justify-content:center}
  .modal-pad{padding:1.25rem 1.1rem!important}
  .sec-pad{padding:4rem 1rem!important}
  .gal-dots{display:none}
  .hero-cue{display:none!important}
  .mob-hide{display:none!important}
  .mob-full{grid-template-columns:1fr!important}
  .mob-stack{flex-direction:column!important}
  .mob-p{padding:1rem!important}
  .mob-tabbar{display:block!important}
  .mob-pb{padding-bottom:80px!important}
  .mob-2col{grid-template-columns:repeat(2,1fr)!important}
  .mob-wrap{flex-wrap:wrap!important}
  .mob-only{display:inline-flex!important}
  .adm-head h1{font-size:1.05rem!important}
}
.mob-only{display:none}
.mtabs{display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;scroll-snap-type:x proximity}
.mtabs::-webkit-scrollbar{display:none}
.mtab{flex:0 0 auto;min-width:64px;min-height:56px;padding:.35rem .55rem;background:none;border:none;border-top:2px solid transparent;color:#B8A898;font-family:'Lato',sans-serif;font-size:.6rem;letter-spacing:.03em;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.15rem;white-space:nowrap;scroll-snap-align:start}
.mtab .ic{font-size:1.05rem;line-height:1}
.mtab.act{color:#E8C97A;border-top-color:#C4973A;background:rgba(196,151,58,.1)}
.mtab-fade{position:absolute;top:0;right:0;bottom:0;width:28px;pointer-events:none;background:linear-gradient(90deg,rgba(42,31,22,0),#2A1F16)}
.adm-hbtn{min-height:40px;padding:0 .8rem;background:#F0EDE8;color:#2A1F16;border:1px solid #D4C5B0;font-family:'Lato',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:.06em;cursor:pointer;align-items:center;gap:.3rem}
`;

// ─── Primitives ───────────────────────────────────────────────────────
const FL = ({children,htmlFor,id}) => <label className="field-label" htmlFor={htmlFor} id={id}>{children}</label>;
// Prev/next arrows overlaid on the room-photo lightbox
const lightboxArrow = (side) => ({
  position:"absolute", top:"35%", [side]:"-4px", transform:"translateY(-50%)",
  width:44, height:44, borderRadius:"50%", zIndex:2,
  background:"rgba(26,15,8,.62)", border:"1px solid rgba(196,151,58,.55)",
  color:"#E8D9B8", fontSize:"1.7rem", lineHeight:1, cursor:"pointer",
  display:"flex", alignItems:"center", justifyContent:"center",
});
// Small square control under each room-photo thumbnail (reorder / cover / delete)
const photoBtn = (disabled) => ({
  flex:1, padding:".2rem 0", fontSize:".68rem", lineHeight:1.2,
  fontFamily:"'Lato',sans-serif", background:"#fff", color:"#2A1F16",
  border:"1px solid #E0D5C7", cursor:disabled?"default":"pointer",
  opacity:disabled?0.35:1,
});
const Inp = ({style={},className="",...p}) => <input className={`inp ${className}`} style={style} {...p}/>;
const Sel = ({children,style={},...p}) => <select className="sel" style={style} {...p}>{children}</select>;
const Bdg = ({s}) => {
  const cfg = {
    confirmed:  {cls:"confirmed",  style:{},                              label:"Confirmada"},
    checked_in: {cls:"confirmed",  style:{background:"#1565C0",color:"#fff"}, label:"🏨 En Hotel"},
    finalizada: {cls:"confirmed",  style:{background:"#2E7D32",color:"#fff"}, label:"✓ Finalizada"},
    pending:    {cls:"pending",    style:{},                              label:"Pendiente"},
    cancelled:  {cls:"cancelled",  style:{},                              label:"Cancelada"},
  };
  const c = cfg[s]||cfg.pending;
  return <span className={`badge-${c.cls}`} style={c.style}>{c.label}</span>;
};
const SHead = ({eyebrow,title,dark,left,id,eyebrowColor}) => (
  <div style={{textAlign:left?"left":"center",marginBottom:"3rem"}}>
    <p style={{color:eyebrowColor||(dark?"#C4973A":"#8A6420"),fontSize:".65rem",fontFamily:"'Lato',sans-serif",letterSpacing:".32em",textTransform:"uppercase",marginBottom:".45rem"}}>{eyebrow}</p>
    <h2 id={id} style={{fontSize:"clamp(1.85rem,3.8vw,2.85rem)",fontWeight:300,color:dark?"#F7F3EE":"#2A1F16",letterSpacing:".04em"}}>{title}</h2>
    <div style={{width:44,height:1,background:"#C4973A",margin:left?".9rem 0":"1rem auto"}}/>
  </div>
);
// Every overlay is a real modal dialog (see lib/dialog.js). The title element of
// whatever is inside picks up the id from DialogTitle so aria-labelledby resolves.
const DialogTitle = createContext(undefined);
const useDialogTitleId = () => useContext(DialogTitle);
function Backdrop({onClose,children,label,style,onKeyDown}){
  const ref = useRef(null);
  const titleId = useId();
  useDialog(ref, onClose, label ? undefined : titleId);
  return (
    <DialogTitle.Provider value={titleId}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={label?undefined:titleId} aria-label={label} tabIndex={-1}
        onClick={e=>{if(e.target===e.currentTarget)onClose();}} onKeyDown={onKeyDown}
        style={{position:"fixed",inset:0,background:"rgba(26,15,8,.82)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,padding:"1rem",overflowY:"auto",...style}}>
        {children}
      </div>
    </DialogTitle.Provider>
  );
}
const DialogHeading = ({children,style}) => <h2 id={useDialogTitleId()} style={style}>{children}</h2>;
const ModalBox = ({children,width=580}) => (
  <div className="scalein lt" style={{background:"#fff",width:"100%",maxWidth:width,maxHeight:"92vh",overflowY:"auto"}}>{children}</div>
);
const ModalHdr = ({title,sub,onClose,closeLabel="Cerrar"}) => {
  const titleId = useDialogTitleId();
  return (
    <div style={{padding:"1.6rem 2rem",borderBottom:"1px solid #EDE6D9",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}} className="modal-pad">
      <div>
        {sub&&<div style={{color:"#8A6420",fontSize:".62rem",fontFamily:"'Lato',sans-serif",letterSpacing:".2em",textTransform:"uppercase",marginBottom:".2rem"}}>{sub}</div>}
        <h2 id={titleId} style={{fontSize:"1.3rem",fontWeight:500,color:"#2A1F16"}}>{title}</h2>
      </div>
      <button type="button" onClick={onClose} aria-label={closeLabel} style={{background:"none",border:"none",fontSize:"1.8rem",cursor:"pointer",color:"#756657",lineHeight:1,marginLeft:"1rem",padding:"0 .25rem",minWidth:44,minHeight:44}}>×</button>
    </div>
  );
};

// ─── Booking confirmation screen ──────────────────────────────────────
function PayPalDepositButton({bookingId, depositAmount, roomName, nights, onSuccess}) {
  const containerRef = useRef(null);
  useEffect(()=>{
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    if(!clientId||!containerRef.current) return;
    // Load SDK if not already loaded
    const existing = document.getElementById('paypal-sdk');
    const init = () => {
      if(!window.paypal||!containerRef.current) return;
      containerRef.current.innerHTML='';
      window.paypal.Buttons({
        style:{layout:'vertical',color:'gold',shape:'rect',label:'pay',height:45},
        createOrder: async()=>{
          const res = await fetch('/api/create-paypal-order',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({depositAmount,roomName,nights,bookingId}),
          });
          const {orderID,error}=await res.json();
          if(error) throw new Error(error);
          return orderID;
        },
        onApprove: async(data)=>{
          const res = await fetch('/api/capture-paypal-order',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({orderID:data.orderID,bookingId}),
          });
          const result=await res.json();
          if(result.success && onSuccess) onSuccess(result.amountPaid);
        },
        onError:(err)=>{ console.error('PayPal error:',err); alert('Hubo un error con el pago. Intenta de nuevo.'); },
      }).render(containerRef.current);
    };
    if(existing){ init(); }
    else {
      const script=document.createElement('script');
      script.id='paypal-sdk';
      script.src=`https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
      script.onload=init;
      document.head.appendChild(script);
    }
    return()=>{ if(containerRef.current) containerRef.current.innerHTML=''; };
  },[bookingId,depositAmount]);
  return <div ref={containerRef} style={{marginTop:'.5rem'}}/>;
}

function ConfirmationScreen({booking, room, lang, settings, onClose, onPaymentSuccess}) {
  const t = (es,en) => lang==="es"?es:en;
  const n = nights(booking.checkIn, booking.checkOut);
  const headRef = useRef(null);
  useEffect(()=>{ window.scrollTo(0,0); headRef.current?.focus({preventScroll:true}); },[]);
  const roomLabel = lang==="es" ? room?.name : (room?.nameEn||room?.name);
  const contactLine = booking.email
    ? t(`Tu solicitud para ${room?.name} ha sido recibida. Te contactaremos al correo ${booking.email} para confirmar tu reserva.`,
        `Your request for ${roomLabel} has been received. We will contact you at ${booking.email} to confirm your booking.`)
    : t(`Tu solicitud para ${room?.name} ha sido recibida. Te contactaremos por WhatsApp al ${booking.phone} para confirmar tu reserva.`,
        `Your request for ${roomLabel} has been received. We will contact you on WhatsApp at ${booking.phone} to confirm your booking.`);
  return(
    <main style={{fontFamily:"'Cormorant Garamond',serif",minHeight:"100vh",background:"#F7F3EE",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1rem"}}>
      <style>{css}</style>
      <div className="scalein lt" style={{background:"#fff",maxWidth:560,width:"100%",textAlign:"center",overflow:"hidden"}}>
        <div style={{background:"#2A1F16",padding:"2.5rem 2rem"}}>
          <div aria-hidden="true" style={{width:60,height:60,borderRadius:"50%",background:"#C4973A",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem",fontSize:"1.8rem"}}>✓</div>
          <div style={{color:"#C4973A",fontSize:".65rem",fontFamily:"'Lato',sans-serif",letterSpacing:".3em",textTransform:"uppercase",marginBottom:".5rem"}}>{t("SOLICITUD ENVIADA","REQUEST SENT")}</div>
          <h1 ref={headRef} tabIndex={-1} style={{color:"#F7F3EE",fontSize:"1.8rem",fontWeight:300,letterSpacing:".06em",outline:"none"}}>
            {t("¡Gracias,","Thank you,")} {booking.name}!
          </h1>
        </div>
        <div style={{padding:"2rem"}} className="modal-pad">
          <p style={{fontFamily:"'Lato',sans-serif",fontSize:".88rem",color:"#8B6B4E",lineHeight:1.7,marginBottom:"1rem"}}>{contactLine}</p>
          <div style={{background:"#F7F3EE",padding:"1.25rem",marginBottom:"1.5rem",textAlign:"left"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",fontFamily:"'Lato',sans-serif",fontSize:".8rem"}}>
              {[[t("Habitación","Room"),roomLabel],[t("Entrada","Check-in"),booking.checkIn],[t("Salida","Check-out"),booking.checkOut],[t("Noches","Nights"),n],[t("Huéspedes","Guests"),booking.guests],[t("Total estimado","Estimated total"),fmtMoney(booking.total)]].map(([l,v])=>(
                <div key={l}><div style={{color:"#8A6420",fontSize:".6rem",letterSpacing:".15em",textTransform:"uppercase",marginBottom:".15rem"}}>{l}</div><div style={{fontWeight:700,color:"#2A1F16"}}>{v}</div></div>
              ))}
            </div>
          </div>
          <p style={{fontFamily:"'Lato',sans-serif",fontSize:".78rem",color:"#756657",marginBottom:"1.5rem",fontStyle:"italic"}}>
            {t("*Precios sujetos a confirmación.","*Prices subject to confirmation.")}
          </p>
          {PAYPAL_ON&&(()=>{
            // Shown only when PayPal is configured; without a client id the button renders nothing.
            const dep=Math.max(20,Math.round(booking.total*0.30));
            return(
              <div style={{background:"#2A1F16",padding:"1.25rem 1.5rem",marginBottom:"1.5rem",borderRadius:4,textAlign:"left"}}>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".7rem",color:"#C4973A",letterSpacing:".2em",textTransform:"uppercase",marginBottom:".4rem"}}>💳 {t("Confirma tu reserva ahora","Confirm your booking now")}</p>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".82rem",color:"#B8A898",marginBottom:"1rem",lineHeight:1.5}}>{t(`Paga un depósito del 30% ($${dep}) y tu habitación queda confirmada inmediatamente — sin esperar.`,`Pay a 30% deposit ($${dep}) and your room is confirmed immediately — no waiting.`)}</p>
                <PayPalDepositButton bookingId={booking.id} depositAmount={dep} roomName={room?(lang==="es"?room.name:room.nameEn):"Habitación"} nights={booking.nights} onSuccess={onPaymentSuccess}/>
              </div>
            );
          })()}
          <div style={{display:"flex",gap:"1rem",justifyContent:"center",flexWrap:"wrap"}}>
            <button className="btn-gold" onClick={onClose}>{t("VOLVER AL INICIO","BACK TO HOME")}</button>
            <a className="btn-out lt" href={`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(t(`Hola! Acabo de hacer una reserva para ${room?.name} del ${booking.checkIn} al ${booking.checkOut}. Nombre: ${booking.name}`,`Hi! I just made a booking for ${roomLabel} from ${booking.checkIn} to ${booking.checkOut}. Name: ${booking.name}`))}`} target="_blank" rel="noopener noreferrer">
              {t("¿PREGUNTAS? WHATSAPP","QUESTIONS? WHATSAPP")}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}


// ─── MAIN APP ─────────────────────────────────────────────────────────
const EMPTY_NEW_BOOKING = {guest:"",email:"",phone:"",room:1,checkIn:"",checkOut:"",guests:1,notes:"",source:"Direct",status:"confirmed",paid:false,total:"",totalTouched:false};
const EMPTY_BOOK_FORM = {name:"",email:"",phone:"",checkIn:"",checkOut:"",guests:1,notes:"",idType:"cedula",idNumber:"",idPhotoFile:null,idPhotoData:"",privacyAccepted:false};
const langFromPath = (p) => /^\/en(\/|$)/.test(p||"") ? "en" : "es";
const pageFromPath = (p) => /^\/(habitaciones|en\/rooms|rooms)(\/|$)/.test(p||"") ? "rooms" : "home";
const pathFor = (lng,pg) => lng==="en" ? (pg==="rooms"?"/en/rooms":"/en") : (pg==="rooms"?"/habitaciones":"/");
const PAGE_TITLES = {
  home:["Caonabo 35 · Hotel boutique en Santo Domingo","Caonabo 35 · Boutique Hotel in Santo Domingo"],
  rooms:["Habitaciones y precios · Caonabo 35, Santo Domingo","Rooms & Rates · Caonabo 35, Santo Domingo"],
};

// initialLang / initialPage come from the prerendered page via main.jsx (contract §7);
// without them the URL path decides, so /en works on the plain SPA build too.
export default function App({initialLang, initialPage} = {}) {
  const [view,setView] = useState(()=>{ try{ if(new URLSearchParams(window.location.search).has('admin')) return "admin"; return sessionStorage.getItem('c35_view')||"public";}catch{return "public";} });
  const [lang,setLang] = useState(()=> initialLang==="en"||initialLang==="es" ? initialLang : langFromPath(typeof window!=="undefined"?window.location.pathname:"/"));
  const [page] = useState(()=> initialPage==="rooms"||initialPage==="home" ? initialPage : pageFromPath(typeof window!=="undefined"?window.location.pathname:"/"));
  const [menuOpen,setMenuOpen] = useState(false);
  const navRef = useRef(null);
  const menuBtnRef = useRef(null);
  useEffect(()=>{
    if(!menuOpen) return undefined;
    const onKey = (e)=>{ if(e.key==="Escape"){ setMenuOpen(false); menuBtnRef.current?.focus(); } };
    const onDown = (e)=>{ if(navRef.current && !navRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("keydown",onKey);
    document.addEventListener("pointerdown",onDown);
    return ()=>{ document.removeEventListener("keydown",onKey); document.removeEventListener("pointerdown",onDown); };
  },[menuOpen]);
  const [adminAuth,setAdminAuth] = useState(false);
  const [adminEmail,setAdminEmail] = useState("");
  const [authLoading,setAuthLoading] = useState(false);
  const [adminPwd,setAdminPwd] = useState("");
  const [pwdError,setPwdError] = useState("");
  const [adminTab,setAdminTab] = useState(()=>{ try{return sessionStorage.getItem('c35_tab')||"dashboard";}catch{return "dashboard";} });
  useEffect(()=>{ try{sessionStorage.setItem('c35_tab',adminTab);}catch{} },[adminTab]);
  useEffect(()=>{ try{document.querySelector('.mtab.act')?.scrollIntoView({block:"nearest",inline:"center"});}catch{} },[adminTab,view]);
  const [calView,setCalView] = useState("mes");       // unified Calendario hub: "mes" (month grid) | "precios" (per-night grid)
  const [resSearch,setResSearch] = useState("");        // search across ALL reservations from the Calendario hub
  const [gridVersion,setGridVersion] = useState(0);   // bumped on room_nights realtime change → forces the price grid to reload live
  const [channelBlocks,setChannelBlocks] = useState(()=>new Map());  // `${roomId}|YYYY-MM-DD` → source, imported from Airbnb/Booking iCal
  const [channelFeeds,setChannelFeeds] = useState([]);               // configured channel_calendars rows
  const [feedForm,setFeedForm] = useState({room_id:"",source:"airbnb",ics_url:"",label:""});
  const [syncing,setSyncing] = useState(false);
  const [emailsOn,setEmailsOn] = useState(false);   // master switch for automated guest emails (off until owner enables)
  const [toast,setToast] = useState("");

  // Data
  const [rooms,setRooms] = useState(()=>{
    try {
      const prices = JSON.parse(localStorage.getItem('c35_prices')||'{}');
      const disc   = JSON.parse(localStorage.getItem('c35_discounts')||'{}');
      return ROOMS_INIT.map(r=>({
        ...r,
        price:    prices[r.id]!=null ? Number(prices[r.id])    : r.price,
        discount: disc[r.id]  !=null ? Number(disc[r.id])      : r.discount,
      }));
    } catch(e){ return ROOMS_INIT; }
  });
  const [bookings,setBookings] = useState([]);
  const [bookingsLoading,setBookingsLoading] = useState(true);
  const [messages,setMessages] = useState([]);
  const [messagesLoading,setMessagesLoading] = useState(true);
  const [expenses,setExpenses] = useState([]);
  const [expensesLoading,setExpensesLoading] = useState(true);
  const [reviews,setReviews] = useState(REVIEWS_INIT);   // sample testimonials — kept as public filler until real ones accumulate
  const [dbReviews,setDbReviews] = useState([]);          // real, verified guest reviews from the DB
  const [reviewParam,setReviewParam] = useState(()=>{ try{return new URLSearchParams(window.location.search).get('rev');}catch{return null;} });
  const [reviewToken] = useState(()=>{ try{return new URLSearchParams(window.location.search).get('t')||"";}catch{return "";} });
  const [reviewForm,setReviewForm] = useState({rating:5,body:"",name:"",done:false,err:"",sending:false});
  const [settings,setSettings] = useState(SETTINGS_INIT);

  // Public UI
  const [selRoom,setSelRoom] = useState(null);
  const [bookModal,setBookModal] = useState(false);
  const [bookForm,setBookForm] = useState(EMPTY_BOOK_FORM);
  const [bookError,setBookError] = useState("");
  const [fieldErrors,setFieldErrors] = useState({});
  const [submitting,setSubmitting] = useState(false);
  const [idPhotoBusy,setIdPhotoBusy] = useState(false);
  const [modalAvail,setModalAvail] = useState({key:"",status:"idle"}); // idle | checking | available | unavailable | error
  const [detailsOpen,setDetailsOpen] = useState(false);
  const [roomsLoaded,setRoomsLoaded] = useState(false);
  const fieldRefs = useRef({});
  const bookErrorRef = useRef(null);
  const [showConfirmation,setShowConfirmation] = useState(null); // holds completed booking
  const [showPrivacy,setShowPrivacy] = useState(false);
  const [guestPortalOpen,setGuestPortalOpen] = useState(false);
  const [guestLookup,setGuestLookup] = useState({id:'',email:'',phone:''});
  const [guestBooking,setGuestBooking] = useState(null);
  const [guestLookupError,setGuestLookupError] = useState('');
  const [guestLookupLoading,setGuestLookupLoading] = useState(false);
  const [galFilter,setGalFilter] = useState("all");
  const [galOpen,setGalOpen] = useState(null);
  const [roomLightbox,setRoomLightbox] = useState(null);
  const [amenModal,setAmenModal] = useState(null);

  // Availability checker
  const [availDates,setAvailDates] = useState({checkIn:"",checkOut:""});
  const [bookedRoomIds,setBookedRoomIds] = useState(null); // null = not checked yet
  const [availLoading,setAvailLoading] = useState(false);
  const [availError,setAvailError] = useState("");
  const [roomPriceOverrides,setRoomPriceOverrides] = useState({});
  const [seasons,setSeasons] = useState([]);
  const [editSeasons,setEditSeasons] = useState(false);
  const [newSeason,setNewSeason] = useState({name:'',startMonth:'12',startDay:'15',endMonth:'01',endDay:'05',pct:20});
  const [editRange,setEditRange] = useState(false);   // his dad's "temporary price for a date range that reverts"
  const [newRange,setNewRange] = useState({name:'',room:'all',start:'',end:'',price:''});
  const [editRoomPrices,setEditRoomPrices] = useState({});
  const [priceEdits,setPriceEdits] = useState({});
  // Admin UI
  const [editBooking,setEditBooking] = useState(null);
  const [newBookModal,setNewBookModal] = useState(false);
  const [newB,setNewB] = useState(EMPTY_NEW_BOOKING);
  const [bookingAction,setBookingAction] = useState(null);   // booking awaiting "cancel or delete?"
  const [saving,setSaving] = useState(false);
  const [newBError,setNewBError] = useState("");
  const [editRoom,setEditRoom] = useState(null);
  const [editRoomD,setEditRoomD] = useState(null);
  const [photoBusy,setPhotoBusy] = useState(false);
  const [replyModal,setReplyModal] = useState(null);
  const [replyTxt,setReplyTxt] = useState("");
  const [addExpModal,setAddExpModal] = useState(false);
  const [newExp,setNewExp] = useState({date:"",category:"Limpieza",desc:"",amount:"",paid:false});
  const [editExpModal,setEditExpModal] = useState(false);
  const [editExpD,setEditExpD] = useState(null);
  const [expFilter,setExpFilter] = useState("all");
  const [editSettings,setEditSettings] = useState(false);
  const [settDraft,setSettDraft] = useState(SETTINGS_INIT);
  const [settErr,setSettErr] = useState("");
  const [addMsgModal,setAddMsgModal] = useState(false);
  const [newMsg,setNewMsg] = useState({guest:"",email:"",phone:"",message:""});
  const [editReview,setEditReview] = useState(null);
  const [filterStatus,setFilterStatus] = useState("all");
  const [detailB,setDetailB] = useState(null);
  const [editBError,setEditBError] = useState("");

  // Calendar — single month nav, opens on the current month
  const [calYear,setCalYear] = useState(()=>Number(todaySD().slice(0,4)));
  const [calMonth,setCalMonth] = useState(()=>Number(todaySD().slice(5,7))-1); // 0-indexed

  // Live hotel date: the arrivals/departures panels must roll over at midnight without a reload.
  const [TODAY,setTodayYmd] = useState(todaySD);
  useEffect(()=>{
    const tick = ()=>{ const d=todaySD(); setTodayYmd(prev=>prev===d?prev:d); };
    const iv = setInterval(tick, 60000);
    const onVis = ()=>{ if(document.visibilityState==="visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", tick);
    return ()=>{ clearInterval(iv); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", tick); };
  },[]);

  // room_nights (per-night price / closed nights) for the date ranges in use, loaded on demand
  // — a whole-year fetch would hit PostgREST's 1000-row cap. Anon can read this table.
  const [nightMap,setNightMap] = useState(()=>new Map());
  const nightCache = useRef(new Map());   // "from|to" → Promise<Map>
  const ensureNights = (from, to) => {
    if(!isYmd(from)||!isYmd(to)||from>=to) return Promise.resolve(nightMap);
    const key = `${from}|${to}`;
    if(!nightCache.current.has(key)){
      nightCache.current.set(key, (async()=>{
        const {data,error} = await supabase.from("room_nights").select("room_id,date,price,available").gte("date",from).lt("date",to);
        if(error||!data){ nightCache.current.delete(key); return null; }
        const add = new Map(data.map(r=>[nightKey(r.room_id,r.date),{price:r.price,available:r.available}]));
        setNightMap(prev=>{
          const merged = new Map(prev);
          for(let d=from; d<to; d=addDays(d,1)) for(const r of rooms) merged.delete(nightKey(r.id,d));
          add.forEach((v,k)=>merged.set(k,v));
          return merged;
        });
        return add;
      })());
    }
    return nightCache.current.get(key);
  };
  useEffect(()=>{ if(gridVersion) nightCache.current.clear(); },[gridVersion]);
  useEffect(()=>{ if(editBooking) ensureNights(editBooking.checkIn,editBooking.checkOut); },[editBooking?.checkIn,editBooking?.checkOut,gridVersion]);
  useEffect(()=>{ if(newBookModal) ensureNights(newB.checkIn,newB.checkOut); },[newBookModal,newB.checkIn,newB.checkOut,gridVersion]);

  const t = (es,en) => lang==="es"?es:en;
  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3200); };

  // Derived — isRev (lib/admin.js): a completed (finalizada) stay still earned money, so it counts.
  const confirmed = bookings.filter(isRev);
  const totalRev = confirmed.reduce((s,b)=>s+b.total,0);
  const totalExp = expenses.reduce((s,e)=>s+e.amount,0);
  const netRev = totalRev-totalExp;
  const pendingCnt = bookings.filter(b=>b.status==="pending").length;
  const unreadCnt = messages.filter(m=>!m.read).length;
  const occupiedToday = bookings.filter(b=>isRev(b)&&b.checkIn<=TODAY&&b.checkOut>TODAY).length;
  const unpaid = confirmed.filter(b=>!b.paid).reduce((s,b)=>s+b.total,0);
  // ── Owner KPIs: ADR (avg nightly rate), RevPAR (revenue per available room, trailing 30d), net-of-OTA-commission ──
  const revNights = confirmed.reduce((s,b)=>s+nights(b.checkIn,b.checkOut),0);
  const adr = revNights ? Math.round(totalRev/revNights) : 0;
  const otaCommission = otaCommissionOf(bookings);   // Airbnb + Booking.com only
  const netRevenue = totalRev - otaCommission;
  const revpar30 = (()=>{
    const days=30, avail=rooms.length*days; if(!avail) return 0;
    const pad=n=>String(n).padStart(2,'0');
    const start=new Date(TODAY+"T00:00:00"); start.setDate(start.getDate()-(days-1));
    const win=new Set();
    for(let i=0;i<days;i++){const d=new Date(start);d.setDate(d.getDate()+i);win.add(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);}
    let rev=0;
    confirmed.forEach(b=>{
      const n=nights(b.checkIn,b.checkOut); if(!n||!b.checkIn) return;
      const rate=(b.total||0)/n; const d=new Date(b.checkIn+"T00:00:00");
      for(let i=0;i<n;i++){const dd=new Date(d);dd.setDate(dd.getDate()+i);if(win.has(`${dd.getFullYear()}-${pad(dd.getMonth()+1)}-${pad(dd.getDate())}`))rev+=rate;}
    });
    return Math.round(rev/avail*100)/100;
  })();

  // Calendar helpers
  const calNavPrev = () => { let m=calMonth-1,y=calYear; if(m<0){m=11;y--;} setCalMonth(m);setCalYear(y); };
  const calNavNext = () => { let m=calMonth+1,y=calYear; if(m>11){m=0;y++;} setCalMonth(m);setCalYear(y); };
  const dayBookings = (y,m,d) => {
    const date=fmtDate(y,m,d);
    return bookings.filter(b=>b.status!=="cancelled"&&b.checkIn<=date&&b.checkOut>date);
  };

  // ─── Data loading ─────────────────────────────────────────────────
  // Public visitors only need rooms, settings and approved reviews; the admin
  // tables are fetched once someone is signed in (they return nothing to anon anyway).
  async function fetchBookings(){
    setBookingsLoading(true);
    const{data,error}=await supabase.from("bookings").select("*").order("created_at",{ascending:false});
    if(!error&&data) setBookings(data.map(mapBookingRow));
    setBookingsLoading(false);
  }
  useEffect(()=>{
    fetchRoomPrices();
    fetchSettings();
    fetchDbReviews();
  },[]);
  useEffect(()=>{
    if(!adminAuth) return;
    fetchBookings();
    fetchExpenses();
    fetchMessages();
    fetchChannels();
  },[adminAuth]);

  // Keep <html lang>, the title and the URL in step with the language (contract §7).
  useEffect(()=>{
    try{
      document.documentElement.lang = lang;
      if(view!=="admin") document.title = PAGE_TITLES[page][lang==="es"?0:1];
    }catch{}
  },[lang,page,view]);
  useEffect(()=>{
    const onPop = ()=>setLang(langFromPath(window.location.pathname));
    window.addEventListener("popstate",onPop);
    return ()=>window.removeEventListener("popstate",onPop);
  },[]);
  useEffect(()=>{
    if(page!=="rooms") return;
    const id = requestAnimationFrame(()=>{ try{document.getElementById("rooms")?.scrollIntoView({behavior:"instant",block:"start"});}catch{document.getElementById("rooms")?.scrollIntoView();} });
    return ()=>cancelAnimationFrame(id);
  },[]);
  async function fetchDbReviews(){
    const {data} = await supabase.from('reviews').select('*').order('created_at',{ascending:false});
    if(data) setDbReviews(data);
  }
  // Admin-only API routes verify this bearer token server-side (admins allow-list).
  async function authHeaders(extra={}){
    try{
      const {data:{session}} = await supabase.auth.getSession();
      return session?.access_token ? {...extra,Authorization:`Bearer ${session.access_token}`} : {...extra};
    }catch{ return {...extra}; }
  }
  async function sendGuestEmails(){
    try{
      const headers = await authHeaders();
      if(!headers.Authorization) return;
      await fetch('/api/guest-emails',{method:'POST',headers});
    }catch{}
  }
  async function exportIcal(room){
    try{
      const headers = await authHeaders();
      if(!headers.Authorization){ showToast("❌ Sesión expirada — vuelve a entrar"); return; }
      const res = await fetch('/api/export-ical'+(room?`?room=${encodeURIComponent(room.id)}`:''),{headers});
      if(!res.ok){ showToast("❌ No se pudo exportar el calendario"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = room ? `caonabo35-${String(room.name||room.id).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w-]+/g,'-').toLowerCase()}.ics` : 'caonabo35.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 10000);
      showToast("Calendario descargado ✓");
    }catch{ showToast("❌ No se pudo exportar el calendario"); }
  }

  // ─── Channel calendar sync (Airbnb / Booking.com iCal import) ───
  async function fetchChannels(){
    const [{data:feeds},{data:blocks},{data:st}] = await Promise.all([
      supabase.from('channel_calendars').select('*').order('created_at',{ascending:true}),
      supabase.from('channel_blocks').select('room_id,date,source'),
      supabase.from('settings').select('guest_emails_on').eq('id',1).maybeSingle(),
    ]);
    if(feeds) setChannelFeeds(feeds);
    if(blocks) setChannelBlocks(new Map(blocks.map(b=>[`${String(b.room_id)}|${b.date}`,b.source])));
    if(st) setEmailsOn(!!st.guest_emails_on);
  }
  async function toggleGuestEmails(){
    const next=!emailsOn;
    const {error}=await supabase.from('settings').update({guest_emails_on:next}).eq('id',1);
    if(error){showToast("❌ "+error.message);return;}
    setEmailsOn(next);
    showToast(next?"Correos automáticos ACTIVADOS ✓":"Correos automáticos desactivados");
    if(next) sendGuestEmails();
  }
  async function syncChannels(silent=false){
    setSyncing(true);
    try{
      const res = await fetch('/api/sync-calendars',{method:'POST',headers:await authHeaders()});
      const j = await res.json().catch(()=>({}));
      await fetchChannels();
      if(!silent){ if(res.ok) showToast(`Sincronizado ✓ ${j.blocks??0} noche(s) de otros canales`); else showToast('❌ '+(j.error||'Error al sincronizar')); }
    }catch(e){ if(!silent) showToast('❌ '+e.message); }
    setSyncing(false);
  }
  // On admin open: refresh OTA blocks + fire any due pre-arrival / post-stay guest emails.
  useEffect(()=>{ if(adminAuth){ syncChannels(true); sendGuestEmails(); } },[adminAuth]);
  async function addFeed(){
    if(!feedForm.ics_url.trim()){showToast("Pega el enlace iCal del canal");return;}
    const label = feedForm.label.trim() || (feedForm.source==='airbnb'?'Airbnb':feedForm.source==='booking'?'Booking.com':'Canal');
    const {error} = await supabase.from('channel_calendars').insert([{room_id:feedForm.room_id||null,source:feedForm.source,ics_url:feedForm.ics_url.trim(),label}]);
    if(error){showToast("❌ "+error.message);return;}
    setFeedForm({room_id:"",source:"airbnb",ics_url:"",label:""});
    await fetchChannels();
    showToast("Calendario añadido ✓ — sincronizando…");
    syncChannels();
  }
  async function deleteFeed(feed){
    let q = supabase.from('channel_blocks').delete().eq('source',feed.source);
    if(feed.room_id) q = q.eq('room_id',feed.room_id);
    await q;
    const {error} = await supabase.from('channel_calendars').delete().eq('id',feed.id);
    if(error){showToast("❌ "+error.message);return;}
    await fetchChannels();
    showToast("Calendario eliminado");
  }

  // ─── Fetch messages from Supabase on mount ───────────────────────
  async function fetchMessages(){
    setMessagesLoading(true);
    const{data,error}=await supabase.from("messages").select("*").order("created_at",{ascending:false});
    if(!error&&data){
      setMessages(data.map(r=>({id:r.id,guest:r.guest,email:r.email||"",phone:r.phone||"",message:r.body||r.subject||"",date:r.created_at?r.created_at.slice(0,10):"",read:!!r.read})));
    }
    setMessagesLoading(false);
  }

  // ─── Fetch settings (including seasons) from Supabase on mount ───
  async function fetchSettings() {
    const {data,error} = await supabase.from('settings').select('*').eq('id',1).maybeSingle();
    if(error||!data) return;
    setSettings({
      propName: data.hotel_name || SETTINGS_INIT.propName,
      address: data.address || SETTINGS_INIT.address,
      phone: data.phone || SETTINGS_INIT.phone,
      whatsapp: waDigits(data.whatsapp) || SETTINGS_INIT.whatsapp,
      email: data.email || SETTINGS_INIT.email,
      checkIn: data.check_in_time || SETTINGS_INIT.checkIn,
      checkOut: data.check_out_time || SETTINGS_INIT.checkOut,
      instagram: data.instagram || SETTINGS_INIT.instagram,
      heroSubtitle: data.hero_subtitle || SETTINGS_INIT.heroSubtitle,
      minNights: clampMinNights(data.min_nights ?? SETTINGS_INIT.minNights),
      taxRate: data.tax_rate != null && Number.isFinite(Number(data.tax_rate)) ? Number(data.tax_rate) : SETTINGS_INIT.taxRate,   // a stored 0 stays 0
      currency: SETTINGS_INIT.currency,
    });
    if(data.seasons_json) {
      try { setSeasons(JSON.parse(data.seasons_json)); } catch(e) {}
    }
  }

  async function fetchRoomPrices() {
    // select('*') so an English description column (description_en), if the owner adds one, is picked up.
    const {data,error} = await supabase.from('rooms').select('*');
    if(error||!data){ setRoomsLoaded(true); return; }
    const overrides = {};
    const discMap = {};
    const byId = {};
    data.forEach(row => {
      byId[String(row.id)] = row;
      if(row.price_override!=null) overrides[row.id] = row.price_override;
      if(row.discount!=null) discMap[row.id] = row.discount;
    });
    setRooms(prev=>prev.map(r=>{
      const row = byId[String(r.id)];
      if(!row) return r;
      // DB is the source of truth for editable content; fall back to the built-in default when a column is null
      return {
        ...r,
        price:     row.price_override!=null ? Number(row.price_override) : r.price,
        discount:  row.discount!=null ? Number(row.discount) : r.discount,
        name:      row.name ?? r.name,
        nameEn:    row.name_en ?? r.nameEn,
        beds:      row.beds ?? r.beds,
        guests:    row.guests!=null ? Number(row.guests) : r.guests,
        size:      row.size ?? r.size,
        desc:      row.description ?? r.desc,
        descEn:    row.description_en ?? r.descEn,
        available: row.available!=null ? !!row.available : r.available,
        amenities: Array.isArray(row.amenities) ? row.amenities : r.amenities,
        // null / [] both mean "use the bundled defaults" — roomPhotos() handles the fallback
        photos:    Array.isArray(row.photos) ? row.photos : (r.photos || null),
      };
    }));
    setRoomPriceOverrides(overrides);
    setRoomsLoaded(true);
    // Sync localStorage cache
    try { localStorage.setItem('c35_prices', JSON.stringify(overrides)); } catch(e){}
    try { localStorage.setItem('c35_discounts', JSON.stringify(discMap)); } catch(e){}
  }
  async function saveRoomDiscounts() {
    const discountsMap = {};
    const updatedRooms = rooms.map(r => {
      const key = "d_"+r.id;
      if(editRoomPrices[key]===undefined) return r;
      const d = Math.min(99,Math.max(0,parseInt(editRoomPrices[key])||0));
      discountsMap[r.id] = d;
      return {...r, discount: d};
    });
    // Save discounts to Supabase (source of truth)
    const upserts = Object.entries(discountsMap).map(([id,discount])=>
      supabase.from('rooms').upsert({id:parseInt(id),discount},{onConflict:'id'})
    );
    const results = await Promise.all(upserts);
    const failed = results.find(r=>r.error);
    if(failed) { showToast("❌ Error al guardar descuentos: "+failed.error.message); return; }
    setRooms(updatedRooms);
    setEditRoomPrices(prev=>{ const n={...prev}; Object.keys(discountsMap).forEach(id=>delete n["d_"+id]); return n; });
    showToast("Descuentos actualizados ✓");
  }
  async function saveRoomPrices() {
    const merged = {};
    rooms.forEach(r => {
      const edited = priceEdits[r.id];
      const p = edited !== undefined && edited !== '' ? parseFloat(edited) : r.price;
      if(p > 0) merged[r.id] = p;
    });
    // Save to Supabase — UPSERT (a plain .update() silently affects 0 rows if the room row is missing)
    // and error-check BEFORE updating the UI/cache, so a failed save can't look successful then revert.
    const results = await Promise.all(Object.entries(merged).map(([id,price]) =>
      supabase.from('rooms').upsert({id:parseInt(id), price_override:price},{onConflict:'id'})
    ));
    const failed = results.find(r=>r.error);
    if(failed){ showToast("❌ Error al guardar precios: "+failed.error.message); return; }
    // Save to localStorage cache
    localStorage.setItem('c35_prices', JSON.stringify(merged));
    setRoomPriceOverrides(merged);
    setRooms(prev=>prev.map(r=>({...r, price: merged[r.id]||r.price})));
    setPriceEdits({});
    showToast("Precios actualizados ✓");
  }
  async function fetchExpenses(){
    setExpensesLoading(true);
    const{data,error}=await supabase.from("expenses").select("*").order("date",{ascending:false});
    if(!error&&data){
      setExpenses(data.map(r=>({id:r.id,date:r.date,category:r.category,desc:r.description,amount:parseFloat(r.amount)||0,paid:r.paid})));
    }
    setExpensesLoading(false);
  }

  // ─── Supabase admin auth ─────────────────────────────────────────
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session) setAdminAuth(true);
      else if(sessionStorage.getItem('c35_view')==='admin'&&!new URLSearchParams(window.location.search).has('admin')){sessionStorage.setItem('c35_view','public');setView("public");}
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      setAdminAuth(!!session);
    });
    return()=>subscription.unsubscribe();
  },[]);

  // ─── Supabase Realtime — live booking updates in admin ─────────
  useEffect(()=>{
    if(!adminAuth) return;
    // No broadcast listener: anyone with the public anon key can publish on a
    // broadcast topic, so it could inject fake bookings into this screen.
    const ch = supabase.channel("bookings-live")
      // postgres_changes: RLS-filtered row events for every new booking (web, Airbnb, manual)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"bookings"},p=>{
        const r=p.new;
        setBookings(prev=>{
          if(prev.find(x=>x.id===r.id)) return prev;
          return [mapBookingRow(r),...prev];
        });
        showToast("🔔 Nueva reserva: "+r.guest);
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"bookings"},p=>{
        const r=p.new;
        setBookings(prev=>prev.map(b=>b.id===r.id?mapBookingRow(r):b));
      })
      .on("postgres_changes",{event:"DELETE",schema:"public",table:"bookings"},p=>{
        setBookings(prev=>prev.filter(b=>b.id!==p.old?.id));
      })
      // Live everything: one admin's edit shows on another admin's screen instantly (no refresh).
      .on("postgres_changes",{event:"*",schema:"public",table:"rooms"},()=>fetchRoomPrices())
      .on("postgres_changes",{event:"*",schema:"public",table:"messages"},()=>fetchMessages())
      .on("postgres_changes",{event:"*",schema:"public",table:"expenses"},()=>fetchExpenses())
      .on("postgres_changes",{event:"*",schema:"public",table:"settings"},()=>fetchSettings())
      .on("postgres_changes",{event:"*",schema:"public",table:"channel_blocks"},()=>fetchChannels())
      .on("postgres_changes",{event:"*",schema:"public",table:"reviews"},()=>fetchDbReviews())
      .on("postgres_changes",{event:"*",schema:"public",table:"room_nights"},()=>setGridVersion(v=>v+1))
      .subscribe();
    return()=>supabase.removeChannel(ch);
  },[adminAuth]);

  // ─── Polling fallback: sync bookings when admin is logged in.
  //     Realtime handles instant updates; this is the safety net. It SKIPS while the
  //     tab is hidden — a backgrounded admin tab polling every 15s was starving the
  //     free-tier DB compute — and does one immediate sync when the tab regains focus. ──
  useEffect(()=>{
    if(!adminAuth) return;
    let alive = true;
    const syncBookings = async()=>{
      if(document.visibilityState!=="visible") return;   // don't hammer the DB in the background
      const{data}=await supabase.from("bookings").select("*").order("created_at",{ascending:false});
      if(!data||!alive) return;
      const mapped = data.map(mapBookingRow);
      // Any field edited on another device (dates, room, total, contact…) or a deleted row counts.
      setBookings(prev=>bookingsChanged(prev,mapped)?mapped:prev);
    };
    const poll = setInterval(syncBookings, 30000);
    const onVis = ()=>{ if(document.visibilityState==="visible") syncBookings(); };
    document.addEventListener("visibilitychange", onVis);
    return()=>{ alive=false; clearInterval(poll); document.removeEventListener("visibilitychange", onVis); };
  },[adminAuth]);

  async function adminLogin(){
    if(!adminEmail.trim()||!adminPwd.trim()){setPwdError("Ingresa email y contraseña.");return;}
    setAuthLoading(true);
    const{error}=await supabase.auth.signInWithPassword({email:adminEmail,password:adminPwd});
    setAuthLoading(false);
    if(error){setPwdError("Credenciales incorrectas. Intenta de nuevo.");setAdminPwd("");}
    else{setPwdError("");setAdminEmail("");setAdminPwd("");}
  }

  async function adminLogout(){
    await supabase.auth.signOut();
    setAdminAuth(false);
    try{sessionStorage.setItem('c35_view','public');}catch{}
    setView("public");
  }
  // Leaves the session alone: the footer "Admin" link brings the owner straight back.
  function viewPublicSite(){
    try{sessionStorage.setItem('c35_view','public');}catch{}
    setView("public");
    window.scrollTo(0,0);
  }

  // ─── Guest portal lookup ─────────────────────────────────────────────
  function closeGuestPortal(){
    setGuestPortalOpen(false);setGuestBooking(null);setGuestLookupError('');
    setGuestLookup({id:'',email:'',phone:''});setGuestLookupLoading(false);
  }
  async function lookupGuestBooking() {
    const email = String(guestLookup.email||"").trim().toLowerCase();
    if(!email){setGuestLookupError(t("Ingresa tu email.","Enter your email."));return;}
    if(String(guestLookup.phone||"").replace(/[^0-9]/g,"").length<6){
      setGuestLookupError(t("Ingresa el teléfono de tu reserva.","Enter the phone number on your booking."));return;}
    setGuestLookupLoading(true);
    setGuestLookupError('');
    try {
      const res = await fetch('/api/lookup-booking', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({email, phone: String(guestLookup.phone)})
      });
      const json = await res.json().catch(()=>({}));
      if(res.status===429){ setGuestLookupError(t("Demasiados intentos. Espera unos minutos e intenta de nuevo.","Too many attempts. Please wait a few minutes and try again.")); }
      else if(!res.ok||!json.bookings||json.bookings.length===0){
        setGuestLookupError(res.status===404||res.ok
          ? t("No encontramos reservas con ese email y teléfono.","We couldn’t find a booking with that email and phone.")
          : t("No pudimos buscar tu reserva. Revisa los datos e intenta de nuevo.","We couldn’t look up your booking. Check your details and try again."));
      } else {
        setGuestBooking(json.bookings[0]);
      }
    } catch(e) {
      setGuestLookupError(t("Error al buscar. Intenta de nuevo.","Error searching. Please try again."));
    }
    setGuestLookupLoading(false);
  }

  // ─── Public booking request ─────────────────────────────────────────
  const roomById = (id) => rooms.find(r=>r.id===id);
  // rooms[].available is the DB flag (rooms.available) — the only source of "closed".
  const isRoomClosed = (r) => !!r && r.available===false;
  const minNights = clampMinNights(settings.minNights);
  const quoteRoom = (r, cin, cout, roomNights = nightMap) => quoteFor(r, cin, cout, {seasons, roomNights});
  const nightsClosed = (r, cin, cout, roomNights = nightMap) => !!r && blockedNights(roomNights, r.id, cin, cout).length>0;

  function openBooking(room){
    if(!room) return;
    const cap = Math.max(1, Number(room.guests)||2);
    const useSearch = isYmd(availDates.checkIn) && isYmd(availDates.checkOut) && availDates.checkIn<availDates.checkOut;
    setSelRoom(room.id);
    setBookError(""); setFieldErrors({}); setDetailsOpen(false);
    setBookForm(f=>({...f,
      checkIn: useSearch?availDates.checkIn:f.checkIn,
      checkOut: useSearch?availDates.checkOut:f.checkOut,
      guests: Math.min(Math.max(1,Number(f.guests)||1), cap)}));
    setBookModal(true);
  }
  function closeBooking(){ if(submitting) return; setBookModal(false); setBookError(""); setFieldErrors({}); }

  // Check the chosen dates for this room before asking for contact/ID details.
  // The browser can't read bookings (RLS), so this goes through /api/check-availability;
  // nights the owner closed in the per-night grid (room_nights) are readable directly.
  useEffect(()=>{
    if(!bookModal) return undefined;
    const rm = roomById(selRoom);
    const {checkIn,checkOut} = bookForm;
    if(!rm || validateStay(checkIn,checkOut,todaySD(),minNights)){ setModalAvail({key:"",status:"idle"}); return undefined; }
    const key = `${rm.id}|${checkIn}|${checkOut}`;
    if(isRoomClosed(rm)){ setModalAvail({key,status:"unavailable"}); return undefined; }
    let cancelled = false;
    setModalAvail({key,status:"checking"});
    const timer = setTimeout(async()=>{
      const grid = ensureNights(checkIn,checkOut).catch(()=>null);
      try{
        const res = await fetch(`/api/check-availability?check_in=${encodeURIComponent(checkIn)}&check_out=${encodeURIComponent(checkOut)}`);
        if(!res.ok) throw new Error("http "+res.status);
        const j = await res.json();
        const rows = await grid;
        if(cancelled) return;
        const booked = (j.bookedRooms||[]).map(Number);
        setModalAvail({key,status: booked.includes(Number(rm.id)) || nightsClosed(rm,checkIn,checkOut,rows) ? "unavailable" : "available"});
      }catch{
        const rows = await grid;
        if(!cancelled) setModalAvail({key,status: nightsClosed(rm,checkIn,checkOut,rows) ? "unavailable" : "error"});
      }
    },250);
    return ()=>{ cancelled=true; clearTimeout(timer); };
  },[bookModal,selRoom,bookForm.checkIn,bookForm.checkOut,rooms,minNights]);

  useEffect(()=>{
    if(modalAvail.status==="available"||modalAvail.status==="error") setDetailsOpen(true);
  },[modalAvail.status]);

  function setBookField(k, v){
    setBookForm(f=>({...f,[k]:v}));
    if(fieldErrors[k]) setFieldErrors(e=>({...e,[k]:undefined}));
  }
  function setBookDate(k, v){
    setBookForm(f=>{
      const next = {...f,[k]:v};
      if(k==="checkIn" && isYmd(v) && (!isYmd(f.checkOut) || f.checkOut<=v)) next.checkOut = addDays(v,1);
      return next;
    });
    setFieldErrors(e=>({...e,checkIn:undefined,checkOut:undefined}));
  }

  async function onIdPhotoSelected(file){
    if(!file) return;
    setIdPhotoBusy(true);
    setFieldErrors(e=>({...e,idPhoto:undefined}));
    try{
      const data = await compressImage(file);
      if(!isSafeImageDataUrl(data)) throw new Error("bad image");
      setBookForm(f=>({...f,idPhotoFile:file,idPhotoData:data}));
    }catch{
      setBookForm(f=>({...f,idPhotoFile:null,idPhotoData:""}));
      setFieldErrors(e=>({...e,idPhoto:t("No pudimos leer esa foto. Sube una imagen JPG o PNG (en iPhone, prueba con una captura de pantalla de la foto).","We couldn’t read that photo. Please upload a JPG or PNG image (on iPhone, try a screenshot of the photo).")}));
    }
    setIdPhotoBusy(false);
  }

  const FIELD_ORDER = ["checkIn","checkOut","guests","name","phone","email","idNumber","idPhoto","privacy"];
  function focusField(key){
    requestAnimationFrame(()=>{
      const el = fieldRefs.current[key];
      if(!el) return;
      try{ el.scrollIntoView({block:"center"}); }catch{}
      try{ el.focus({preventScroll:true}); }catch{}
    });
  }
  function showBookError(msg){
    setBookError(msg);
    requestAnimationFrame(()=>{ const el=bookErrorRef.current; if(el){ try{el.scrollIntoView({block:"center"});}catch{} el.focus({preventScroll:true}); } });
  }

  function validateBooking(rm){
    const f = bookForm, e = {};
    const stay = validateStay(f.checkIn, f.checkOut, todaySD(), minNights);
    if(stay) e[stay.field] = stayErrorText(stay.code, lang, stay.min);
    const cap = Math.max(1, Number(rm?.guests)||2);
    if(!(Number(f.guests)>=1 && Number(f.guests)<=cap)) e.guests = t(`Esta habitación admite hasta ${cap} huéspedes.`,`This room takes up to ${cap} guests.`);
    const name = f.name.trim();
    if(!name) e.name = t("Ingresa tu nombre completo.","Enter your full name.");
    else if(name.length>120) e.name = t("El nombre es demasiado largo (máx. 120 caracteres).","That name is too long (max 120 characters).");
    if(!f.phone.trim()) e.phone = t("Ingresa tu número de WhatsApp.","Enter your WhatsApp number.");
    else if(f.phone.replace(/\D/g,"").length<7) e.phone = t("Revisa el número: incluye el código de área.","Check the number: include the area code.");
    const email = f.email.trim();
    if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t("Revisa el formato del email (o déjalo vacío).","Check the email format (or leave it empty).");
    if(!f.idNumber.trim()) e.idNumber = f.idType==="cedula" ? t("Ingresa tu número de cédula.","Enter your cédula number.") : t("Ingresa tu número de pasaporte.","Enter your passport number.");
    if(!f.idPhotoData) e.idPhoto = e.idPhoto || fieldErrors.idPhoto || t("Sube una foto de tu cédula o pasaporte.","Upload a photo of your ID or passport.");
    if(!f.privacyAccepted) e.privacy = t("Debes aceptar la política de privacidad.","You must accept the privacy policy.");
    return e;
  }

  async function submitBooking() {
    if(submitting) return;
    const rm = roomById(selRoom);
    if(!rm) return;
    setBookError("");
    const errs = validateBooking(rm);
    const first = FIELD_ORDER.find(k=>errs[k]);
    if(first){
      setFieldErrors(errs);
      if(["name","phone","email","idNumber","idPhoto","privacy"].includes(first)) setDetailsOpen(true);
      focusField(first);
      return;
    }
    setFieldErrors({});
    if(modalAvail.status==="unavailable"){ showBookError(bookingErrorMessage({code:"P0001",message:"C35_UNAVAILABLE"},lang)); return; }
    setSubmitting(true);
    const f = bookForm;
    const grid = await ensureNights(f.checkIn, f.checkOut).catch(()=>null);
    if(grid && nightsClosed(rm, f.checkIn, f.checkOut, grid)){
      setSubmitting(false);
      setModalAvail({key:`${rm.id}|${f.checkIn}|${f.checkOut}`,status:"unavailable"});
      showBookError(bookingErrorMessage({code:"P0001",message:"C35_UNAVAILABLE"},lang));
      return;
    }
    const pricing = quoteRoom(rm, f.checkIn, f.checkOut, grid || nightMap);
    const email = f.email.trim().toLowerCase();
    const bookingData = {
      guest:f.name.trim(), email, phone:f.phone.trim(),
      room:rm.id, check_in:f.checkIn, check_out:f.checkOut,
      nights:pricing.nights, guests:parseInt(f.guests,10),
      status:'pending', total:pricing.total, paid:false,
      source:'Direct', notes:(f.notes||'').trim(), id_type:f.idType, id_number:f.idNumber.trim(),
      id_photo_url:f.idPhotoData,
    };
    let ins=null, error=null;
    try{
      ({data:ins,error} = await supabase.from('bookings').insert([bookingData]).select('id,readback_token').single());
    }catch(e){ error = {message:String(e?.message||e)}; }
    if(error || !ins){
      setSubmitting(false);
      const key = bookingErrorKey(error||{});
      if(key==="C35_UNAVAILABLE") setModalAvail({key:`${rm.id}|${f.checkIn}|${f.checkOut}`,status:"unavailable"});
      if(key==="C35_PAST_DATE"||key==="C35_INVALID_STAY") setFieldErrors({checkIn:bookingErrorMessage(error,lang)});
      if(key==="C35_CAPACITY") setFieldErrors({guests:bookingErrorMessage(error,lang)});
      showBookError(bookingErrorMessage(error||{},lang));
      return;
    }
    // One-shot, server-verified emails (contract §1): the server loads the booking by id
    // and checks the read-back token, so nothing else needs to be sent.
    const notify = (type) => fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,
      body:JSON.stringify({type,bookingId:ins.id,readbackToken:ins.readback_token})}).catch(()=>{});
    if(email) notify('guest_confirmation');
    notify('admin_notification');
    setSubmitting(false);
    setBookModal(false);
    setBookForm(EMPTY_BOOK_FORM);
    setBookError(""); setFieldErrors({}); setDetailsOpen(false);
    setShowConfirmation({booking:{id:ins.id,name:bookingData.guest,email,phone:bookingData.phone,checkIn:f.checkIn,checkOut:f.checkOut,guests:bookingData.guests,total:pricing.total,nights:pricing.nights}, room:rm});
  }
  // ─── Admin booking create/edit ─────────────────────────────────────
  const quoteDraft = (d, grid = nightMap) => quoteRoom(rooms.find(r=>String(r.id)===String(d.room)), d.checkIn, d.checkOut, grid);
  const adminSaveError = (error) => isOverlapError(error) ? t(ADMIN_OVERLAP_TEXT[0],ADMIN_OVERLAP_TEXT[1])
    : String(error?.code||"")==="23514" ? "Revisa los datos: nombre (máx. 120 letras), email, teléfono (máx. 40), notas (máx. 2000) y un total de 0 o más."
    : "Error al guardar: "+(error?.message||"inténtalo de nuevo");

  // Warnings the owner may override — e.g. he is recording the very Airbnb booking whose imported
  // block sits on those nights. An overlapping booking is a hard stop (the DB refuses it too).
  async function stayWarnings(b){
    const grid = await ensureNights(b.checkIn,b.checkOut).catch(()=>null);
    const closedN = blockedNights(grid||nightMap, b.room, b.checkIn, b.checkOut);
    const own = CHANNEL_OF_SOURCE[b.source];
    const ota = channelNights(channelBlocks, b.room, b.checkIn, b.checkOut).filter(x=>!own||x.source!==own);
    const lines = [];
    if(ota.length) lines.push(`• ${ota.length} noche(s) ya ocupada(s) por Airbnb/Booking.com (desde ${ota[0].date}).`);
    if(closedN.length) lines.push(`• ${closedN.length} noche(s) cerrada(s) en el calendario de precios (desde ${closedN[0]}).`);
    const n = nightsBetween(b.checkIn,b.checkOut);
    if(n>MAX_NIGHTS) lines.push(`• Son ${n} noches — revisa que las fechas estén bien.`);
    return {grid, ok: !lines.length || window.confirm(`Atención:\n${lines.join("\n")}\n\n¿Guardar la reserva de todas formas?`)};
  }

  async function sendConfirmedEmail(bk){
    if(!bk?.email) return "noemail";
    try{
      const res = await fetch('/api/send-email',{method:'POST',headers:await authHeaders({'Content-Type':'application/json'}),
        body:JSON.stringify({type:'booking_confirmed',bookingId:bk.id})});
      return res.ok ? "sent" : "failed";
    }catch{ return "failed"; }
  }
  const confirmToast = (r) => r==="sent" ? "Confirmada ✓ · correo enviado al huésped" : r==="noemail" ? "Confirmada ✓ (sin email: avísale por WhatsApp)" : "Confirmada ✓ · ⚠️ no se pudo enviar el correo";

  async function saveBooking(b) {
    if(saving) return;
    const original = bookings.find(x=>x.id===b.id);
    if(!String(b.guest||"").trim()){ setEditBError("Nombre requerido."); return; }
    const stay = validateAdminStay(b.checkIn, b.checkOut);
    if(stay){ setEditBError(stayErrorText(stay.code,"es")); return; }
    const active = b.status!=="cancelled";
    const stayChanged = !original || String(original.room)!==String(b.room) || original.checkIn!==b.checkIn || original.checkOut!==b.checkOut;
    const reactivated = original?.status==="cancelled" && active;
    let grid = null;
    if(active && (stayChanged||reactivated)){
      if(hasBookingConflict(bookings,b.room,b.checkIn,b.checkOut,b.id)){ setEditBError(t(ADMIN_OVERLAP_TEXT[0],ADMIN_OVERLAP_TEXT[1])); return; }
      const w = await stayWarnings(b);
      if(!w.ok) return;
      grid = w.grid;
    }
    if(stayChanged && !grid) grid = await ensureNights(b.checkIn,b.checkOut).catch(()=>null);
    // Nights always follow the dates; the total only re-prices when room/dates changed.
    const {nights:n, total} = bookingTotals(original, b, d=>quoteDraft(d, grid||nightMap));
    if(!Number.isFinite(total) || total<0){ setEditBError("Revisa el total: escribe un monto válido (ej. 303 o 303.50)."); return; }
    const row = {guest:String(b.guest).trim(),email:String(b.email||"").trim(),phone:String(b.phone||"").trim(),room:Number(b.room),check_in:b.checkIn,check_out:b.checkOut,nights:n,guests:b.guests,status:b.status,total,paid:!!b.paid,source:b.source,notes:String(b.notes||"")};
    setSaving(true);
    // Persist FIRST, then update the UI — otherwise a silent failure "saves" locally and reverts on refresh.
    const {error} = await supabase.from("bookings").update(row).eq("id",b.id);
    setSaving(false);
    if(error){ setEditBError(adminSaveError(error)); return; }
    const updated = {...original, guest:row.guest, email:row.email, phone:row.phone, room:row.room, checkIn:b.checkIn, checkOut:b.checkOut, nights:n, guests:b.guests, status:b.status, total, paid:row.paid, source:b.source, notes:row.notes};
    setBookings(prev=>prev.map(x=>x.id===b.id?updated:x));
    setEditBooking(null);setDetailB(null);setEditBError("");
    if(original?.status==="pending" && b.status==="confirmed") showToast(confirmToast(await sendConfirmedEmail(updated)));
    else showToast("Reserva guardada ✓");
  }

  async function addBookingAdmin() {
    if(saving) return;
    const b = newB;
    if(!b.guest.trim()){setNewBError("Nombre requerido.");return;}
    const stay = validateAdminStay(b.checkIn, b.checkOut);
    if(stay){setNewBError(stayErrorText(stay.code,"es"));return;}
    let grid = null;
    if(b.status!=="cancelled"){
      if(hasBookingConflict(bookings,b.room,b.checkIn,b.checkOut)){ setNewBError(t(ADMIN_OVERLAP_TEXT[0],ADMIN_OVERLAP_TEXT[1])); return; }
      const w = await stayWarnings(b);
      if(!w.ok) return;
      grid = w.grid;
    }
    if(!grid) grid = await ensureNights(b.checkIn,b.checkOut).catch(()=>null);
    const {nights:n, total} = bookingTotals(null, b, d=>quoteDraft(d, grid||nightMap));
    if(!Number.isFinite(total) || total<0){ setNewBError("Revisa el total: escribe un monto válido (ej. 303 o 303.50)."); return; }
    const bData = {guest:b.guest.trim(),email:b.email.trim(),phone:b.phone.trim(),room:Number(b.room),check_in:b.checkIn,check_out:b.checkOut,nights:n,guests:b.guests,total,status:b.status,paid:!!b.paid,source:b.source,notes:b.notes.trim()};
    setSaving(true);
    const {data:ins,error} = await supabase.from("bookings").insert([bData]).select().single();
    setSaving(false);
    if(error||!ins){ setNewBError(adminSaveError(error||{})); return; }
    setBookings(prev=>[mapBookingRow(ins),...prev.filter(x=>x.id!==ins.id)]);
    setNewBookModal(false);
    setNewB(EMPTY_NEW_BOOKING);
    setNewBError("");
    showToast("Reserva creada ✓");
  }

  async function saveRoom(){
    // Persist price, availability AND the editable content (name/beds/size/guests/amenities/description).
    // Before this, only price+available were saved, so size/beds/etc. reverted on refresh (dad's bug).
    const available = editRoomD.available!==false;
    const {error} = await supabase.from('rooms').upsert({
      id: String(editRoomD.id),
      price_override: editRoomD.price,
      available,
      name: editRoomD.name,
      name_en: editRoomD.nameEn,
      beds: editRoomD.beds,
      guests: editRoomD.guests,
      size: editRoomD.size,
      description: editRoomD.desc,
      amenities: editRoomD.amenities,
      photos: Array.isArray(editRoomD.photos) ? editRoomD.photos : null,
    },{onConflict:'id'});
    if(error){ showToast("❌ Error al guardar: "+error.message); return; }
    const updated = rooms.map(r=>r.id===editRoomD.id?{...editRoomD,available}:r);
    setRooms(updated);
    const allPrices = {};
    updated.forEach(r=>{ allPrices[r.id]=r.price; });
    localStorage.setItem('c35_prices', JSON.stringify(allPrices));
    setEditRoom(null);setEditRoomD(null);showToast("Habitación actualizada ✓");
  }
  // ── Room photo management ───────────────────────────────────────────────
  // Every action here persists to the DB IMMEDIATELY rather than waiting for
  // "Guardar cambios". Photo work is slow and easy to lose, and this app has a
  // history of edits silently not sticking — so the write happens first and the
  // UI only updates once the DB confirms it.
  async function persistPhotos(roomId, photos){
    const {error} = await supabase.from('rooms')
      .upsert({id:String(roomId), photos},{onConflict:'id'});
    if(error){ showToast("❌ No se pudo guardar: "+error.message); return false; }
    setRooms(prev=>prev.map(r=>r.id===roomId?{...r,photos}:r));
    setEditRoomD(prev=>prev&&prev.id===roomId?{...prev,photos}:prev);
    return true;
  }

  async function uploadRoomPhotos(roomId, fileList){
    const files = Array.from(fileList||[]).filter(f=>f.type.startsWith('image/'));
    if(!files.length) return;
    setPhotoBusy(true);
    // A room still showing the two bundled defaults has photos === null; its first
    // upload starts a real gallery. After that we append to what is already there.
    const next = Array.isArray(editRoomD?.photos) ? [...editRoomD.photos] : [];
    let added = 0;
    for(const file of files){
      try{
        const blob = await compressToBlob(file, 1600, 1200, 0.82);
        if(blob.size > 4.5*1024*1024){ showToast(`❌ ${file.name} es demasiado grande`); continue; }
        const path = `${roomId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;
        const {error} = await supabase.storage.from(PHOTO_BUCKET)
          .upload(path, blob, {contentType:'image/jpeg', cacheControl:'31536000', upsert:false});
        if(error){ showToast("❌ "+error.message); continue; }
        const {data} = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
        next.push({url:data.publicUrl, path, label:`Foto ${next.length+1}`});
        added++;
      }catch(e){ showToast("❌ Error con "+file.name); }
    }
    if(added){
      const ok = await persistPhotos(roomId, next);
      if(ok) showToast(`${added} foto${added>1?'s':''} subida${added>1?'s':''} ✓`);
    }
    setPhotoBusy(false);
  }

  async function deleteRoomPhoto(roomId, idx){
    const list = Array.isArray(editRoomD?.photos)?[...editRoomD.photos]:[];
    const [gone] = list.splice(idx,1);
    if(!gone) return;
    setPhotoBusy(true);
    const ok = await persistPhotos(roomId, list);
    // Remove the stored file only AFTER the row no longer references it, so a
    // failed write can never leave the page pointing at a deleted image.
    if(ok && gone.path){
      const {error} = await supabase.storage.from(PHOTO_BUCKET).remove([gone.path]);
      if(error) console.warn('Storage cleanup failed (row already updated):', error.message);
    }
    if(ok) showToast("Foto eliminada ✓");
    setPhotoBusy(false);
  }

  async function moveRoomPhoto(roomId, idx, dir){
    const list = Array.isArray(editRoomD?.photos)?[...editRoomD.photos]:[];
    const j = idx+dir;
    if(j<0||j>=list.length) return;
    [list[idx],list[j]] = [list[j],list[idx]];
    setPhotoBusy(true);
    await persistPhotos(roomId, list);
    setPhotoBusy(false);
  }

  async function makeRoomCover(roomId, idx){
    const list = Array.isArray(editRoomD?.photos)?[...editRoomD.photos]:[];
    if(idx<=0||idx>=list.length) return;
    const [pick] = list.splice(idx,1);
    list.unshift(pick);
    setPhotoBusy(true);
    const ok = await persistPhotos(roomId, list);
    if(ok) showToast("Foto de portada actualizada ✓");
    setPhotoBusy(false);
  }

  async function toggleRoomAvail(id) {
    const newVal = rooms.find(r=>r.id===id)?.available===false;   // closed → open, open → closed
    const {error} = await supabase.from('rooms').upsert({id:String(id),available:newVal},{onConflict:'id'});
    if(error){ showToast("❌ Error: "+error.message); return; }
    setRooms(prev=>prev.map(r=>r.id===id?{...r,available:newVal}:r));
    showToast(newVal ? "Habitación habilitada ✓" : "Habitación marcada como cerrada");
  }
  async function updateBookingStatus(id, status) {
    const {error} = await supabase.from('bookings').update({status}).eq('id',id);
    if(error){ showToast("❌ "+(isOverlapError(error)?ADMIN_OVERLAP_TEXT[0]:"Error al guardar: "+error.message)); return false; }
    setBookings(prev=>prev.map(x=>x.id===id?{...x,status}:x));
    if(status==="confirmed") showToast(confirmToast(await sendConfirmedEmail(bookings.find(b=>b.id===id))));
    else showToast(status==="cancelled"?"Reserva cancelada":"Estado actualizado ✓");
    return true;
  }
  async function markPaid(id) {
    const {error} = await supabase.from('bookings').update({paid:true}).eq('id',id);
    if(error){ showToast("❌ Error al guardar: "+error.message); return; }
    setBookings(prev=>prev.map(b=>b.id===id?{...b,paid:true}:b));
    showToast("Marcado como pagado ✓");
  }
  async function checkInGuest(bookingId) {
    const {error} = await supabase.from('bookings').update({status:"checked_in"}).eq('id',bookingId);
    if(error){ showToast("❌ Error al guardar check-in: "+error.message); return; }
    setBookings(prev=>prev.map(b=>b.id===bookingId?{...b,status:"checked_in"}:b));
    setDetailB(prev=>prev?{...prev,status:"checked_in"}:null);
    showToast("Check-in registrado ✓");
  }
  async function checkOutGuest(bookingId) {
    const {error} = await supabase.from('bookings').update({status:"finalizada"}).eq('id',bookingId);
    if(error){ showToast("❌ Error al guardar check-out: "+error.message); return; }
    setBookings(prev=>prev.map(b=>b.id===bookingId?{...b,status:"finalizada"}:b));
    setDetailB(prev=>prev?{...prev,status:"finalizada"}:null);
    // The room's open/closed flag is the owner's call (maintenance etc.) — a check-out never changes it.
    showToast("Check-out registrado ✓ Estancia finalizada");
  }
  // Only reachable from the "cancel or delete?" dialog, which names the guest and dates.
  async function deleteBooking(id) {
    const {error} = await supabase.from('bookings').delete().eq('id',id);
    if(error){ showToast("Error al eliminar: "+error.message); return; }
    setBookings(prev=>prev.filter(b=>b.id!==id));
    setBookingAction(null); setEditBooking(null); setDetailB(null);
    showToast("Reserva eliminada");
  }
  async function cancelBooking(id) {
    if(await updateBookingStatus(id,"cancelled")){ setBookingAction(null); setEditBooking(null); setDetailB(null); }
  }

  // ─── Message actions ──────────────────────────────────────────────
  async function markMessageRead(id){
    const {error} = await supabase.from("messages").update({read:true}).eq("id",id);
    if(error) return;
    setMessages(prev=>prev.map(m=>m.id===id?{...m,read:true}:m));
  }
  async function deleteMessage(id){
    const {error} = await supabase.from("messages").delete().eq("id",id);
    if(error){ showToast("Error al eliminar: "+error.message); return; }
    setMessages(prev=>prev.filter(m=>m.id!==id));
    showToast("Mensaje eliminado");
  }
  async function addMessage(){
    const guest = newMsg.guest.trim(), body = newMsg.message.trim();
    if(!guest||!body){ showToast("Escribe el nombre y el mensaje"); return; }
    setSaving(true);
    const {data,error} = await supabase.from("messages").insert([{guest,email:newMsg.email.trim()||null,phone:newMsg.phone.trim()||null,body,read:true}]).select().single();
    setSaving(false);
    if(error||!data){ showToast("❌ No se pudo guardar el mensaje: "+(error?.message||"")); return; }
    setMessages(prev=>[{id:data.id,guest:data.guest,email:data.email||"",phone:data.phone||"",message:data.body||"",date:(data.created_at||"").slice(0,10)||TODAY,read:!!data.read},...prev.filter(m=>m.id!==data.id)]);
    setAddMsgModal(false);
    setNewMsg({guest:"",email:"",phone:"",message:""});
    showToast("Mensaje guardado ✓");
  }

  // ─── Availability checker ────────────────────────────────────────

  async function checkAvailability() {
    const {checkIn,checkOut} = availDates;
    if(validateStay(checkIn,checkOut,todaySD(),minNights)) return;
    setAvailLoading(true); setAvailError("");
    const grid = ensureNights(checkIn,checkOut).catch(()=>null);
    try {
      const res = await fetch(`/api/check-availability?check_in=${encodeURIComponent(checkIn)}&check_out=${encodeURIComponent(checkOut)}`);
      if(!res.ok) throw new Error("http "+res.status);
      const data = await res.json();
      const rows = await grid;
      const booked = new Set((data.bookedRooms||[]).map(Number));
      rooms.forEach(r=>{ if(nightsClosed(r,checkIn,checkOut,rows)) booked.add(Number(r.id)); });
      setBookedRoomIds([...booked]);
    } catch(e) {
      setBookedRoomIds(null);
      setAvailError(t("No pudimos verificar la disponibilidad. Intenta de nuevo o escríbenos por WhatsApp.","We couldn’t check availability. Please try again or message us on WhatsApp."));
    }
    setAvailLoading(false);
  }
  function setSearchDate(k, v){
    setAvailDates(d=>{
      const next = {...d,[k]:v};
      if(k==="checkIn" && isYmd(v) && (!isYmd(d.checkOut) || d.checkOut<=v)) next.checkOut = addDays(v,1);
      return next;
    });
    setBookedRoomIds(null); setAvailError("");
  }

  async function saveSettings(){
    // wa.me links need digits only; stored that way, shown formatted.
    const whatsapp = waDigits(settDraft.whatsapp);
    if(!isWaNumber(whatsapp)){ setSettErr("Revisa el WhatsApp: escribe el número completo con código de país (ej. +1 809 603 3038)."); return; }
    const taxRate = settDraft.taxRate===""||settDraft.taxRate==null ? 0 : Number(settDraft.taxRate);
    if(!Number.isFinite(taxRate)||taxRate<0){ setSettErr("Revisa el impuesto (%)."); return; }
    const minN = clampMinNights(settDraft.minNights);
    const next = {...settDraft, whatsapp, taxRate, minNights:minN};
    setSaving(true);
    const {error} = await supabase.from("settings").update({hotel_name:next.propName,address:next.address,phone:next.phone,whatsapp,email:next.email,instagram:next.instagram,hero_subtitle:next.heroSubtitle,check_in_time:next.checkIn,check_out_time:next.checkOut,min_nights:minN,tax_rate:taxRate}).eq("id",1);
    setSaving(false);
    if(error){ setSettErr("Error al guardar: "+error.message); return; }
    setSettings(next); setEditSettings(false); setSettErr("");
    showToast("Configuración guardada ✓");
  }

  // ─── Expense CRUD ────────────────────────────────────────────────
  async function addExpense() {
    if(!newExp.date||!newExp.desc||!newExp.amount){showToast("Completa los campos requeridos");return;}
    const row={date:newExp.date,category:newExp.category,description:newExp.desc,amount:parseFloat(newExp.amount),paid:newExp.paid};
    const{data,error}=await supabase.from("expenses").insert([row]).select().single();
    if(error){showToast("Error: "+error.message);return;}
    setExpenses(prev=>[{id:data.id,date:data.date,category:data.category,desc:data.description,amount:parseFloat(data.amount),paid:data.paid},...prev]);
    setAddExpModal(false);
    setNewExp({date:"",category:"Limpieza",desc:"",amount:"",paid:false});
    showToast("Gasto registrado ✓");
  }
  async function saveExpense() {
    if(!editExpD.date||!editExpD.desc||!editExpD.amount){showToast("Completa los campos requeridos");return;}
    const row={date:editExpD.date,category:editExpD.category,description:editExpD.desc,amount:parseFloat(editExpD.amount),paid:editExpD.paid};
    const{error}=await supabase.from("expenses").update(row).eq("id",editExpD.id);
    if(error){showToast("Error: "+error.message);return;}
    setExpenses(prev=>prev.map(e=>e.id===editExpD.id?{...editExpD,amount:parseFloat(editExpD.amount)}:e));
    setEditExpModal(false);setEditExpD(null);
    showToast("Gasto actualizado ✓");
  }
  async function deleteExpense(id) {
    const{error}=await supabase.from("expenses").delete().eq("id",id);
    if(error){ showToast("Error al eliminar: "+error.message); return; }
    setExpenses(prev=>prev.filter(e=>e.id!==id));
    showToast("Gasto eliminado");
  }
  async function markExpPaid(id) {
    const{error}=await supabase.from("expenses").update({paid:true}).eq("id",id);
    if(error){ showToast("Error: "+error.message); return; }
    setExpenses(prev=>prev.map(e=>e.id===id?{...e,paid:true}:e));
    showToast("Marcado como pagado ✓");
  }

  // "Habitaciones" in the gallery = each room's current cover photo from the DB.
  const roomGallery = roomsLoaded ? rooms.map(r=>{const c=coverPhoto(r);return c?{photo:c,label:r.name,labelEn:r.nameEn||r.name,tag:"bedroom",featured:false}:null;}).filter(Boolean) : [];
  const galAll = [...GALLERY, ...roomGallery];
  const galItems = galFilter==="all"?galAll:galAll.filter(g=>g.tag===galFilter);

  // ─── Print/export bookings ────────────────────────────────────────
  function printReport() {
    // Guest names etc. are user input: escape everything written into the popup.
    const e = escapeHtml;
    const rows = bookings.map(b=>{
      const rm = rooms.find(r=>r.id===b.room);
      return `<tr style="border-bottom:1px solid #eee"><td>${e(b.guest)}</td><td>${e(rm?.name||"")}</td><td>${e(b.checkIn)}</td><td>${e(b.checkOut)}</td><td>${e(b.status)}</td><td>${e(fmtMoney(b.total))}</td><td>${b.paid?"Pagado":"Pendiente"}</td></tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><title>Reporte Caonabo 35</title>
      <style>body{font-family:Arial;padding:2cm}table{width:100%;border-collapse:collapse}th{background:#2A1F16;color:#C4973A;padding:8px;text-align:left}td{padding:8px}h1{color:#2A1F16}p{color:#8B6B4E;margin-bottom:1rem}</style>
      </head><body>
      <h1>Caonabo 35 — Reporte de Reservas</h1>
      <p>Generado: ${e(new Date().toLocaleDateString())} · Total reservas: ${e(bookings.length)} · Ingresos confirmados: ${e(fmtMoney(totalRev))}</p>
      <table><thead><tr><th>Huésped</th><th>Habitación</th><th>Entrada</th><th>Salida</th><th>Estado</th><th>Total</th><th>Pago</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;
    const w = window.open("","_blank");
    if(!w){ showToast("Permite ventanas emergentes para imprimir"); return; }
    w.document.write(html);
    w.document.close();
    w.print();
  }

  // ─── Auth screen ───────────────────────────────────────────────────
  if(view==="admin"&&!adminAuth) return(
    <div style={{fontFamily:"'Cormorant Garamond',serif",minHeight:"100vh",background:`linear-gradient(160deg,${C.ebony},${C.mahogany})`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
      <style>{css}</style>
      <div style={{position:"absolute",inset:0,opacity:.03,backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 39px,${C.gold} 39px,${C.gold} 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,${C.gold} 39px,${C.gold} 40px)`}}/>
      <div className="scalein" style={{background:C.white,padding:"2rem",width:"100%",maxWidth:420,position:"relative",margin:"0 1rem"}}>
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{color:C.gold,fontSize:"1.6rem",fontWeight:600,letterSpacing:".12em"}}>CAONABO 35</div>
          <div style={{width:36,height:1,background:C.gold,margin:".7rem auto"}}/>
          <div style={{color:C.taupe,fontSize:".6rem",fontFamily:"'Lato',sans-serif",letterSpacing:".25em"}}>PANEL DE ADMINISTRACIÓN</div>
        </div>
        {pwdError&&<div className="error-banner" style={{textAlign:"center",marginBottom:"1rem"}}>{pwdError}</div>}
        <FL>Email</FL>
        <Inp type="email" value={adminEmail} onChange={e=>{setAdminEmail(e.target.value);setPwdError('');}}
          onKeyDown={e=>{if(e.key==="Enter")adminLogin();}}
          placeholder="admin@caonabo35.com" style={{marginBottom:"1rem"}}/>
        <FL>Contraseña</FL>
        <Inp type="password" value={adminPwd} onChange={e=>{setAdminPwd(e.target.value);setPwdError('');}}
          onKeyDown={e=>{if(e.key==="Enter")adminLogin();}}
          placeholder="Ingresa tu contraseña" style={{marginBottom:"1.25rem"}} className={pwdError?"error":""}/>
        <button className="btn-gold" style={{width:"100%"}} onClick={adminLogin} disabled={authLoading}>
          {authLoading?"Verificando...":"ENTRAR AL PANEL"}
        </button>
      </div>
    </div>
  );

  // ─── Confirmation screen ──────────────────────────────────────────
  if(showConfirmation) return(
    <ConfirmationScreen
      booking={showConfirmation.booking}
      room={showConfirmation.room}
      lang={lang}
      settings={settings}
      onClose={()=>setShowConfirmation(null)}
      onPaymentSuccess={()=>{setShowConfirmation(null);showToast("✅ ¡Pago recibido! Tu reserva está confirmada.");}}
    />
  );


  // ═══════════════════════════════════════════════════════════════════
  // ADMIN PANEL
  // ═══════════════════════════════════════════════════════════════════
  if(view==="admin"&&adminAuth){
    const filtB = filterStatus==="all"?bookings:bookings.filter(b=>b.status===filterStatus);

    // Calendar for current month
    const dim = daysInMonth(calMonth,calYear);
    const fd  = firstWeekday(calMonth,calYear);
    const totalCells = Math.ceil((fd+dim)/7)*7;
    const calTitle = (lang==="es"?MONTH_NAMES_ES:MONTH_NAMES_EN)[calMonth]+" "+calYear;

    const adminTabs=[   // [id, icon, label, badge]
      ["dashboard","📊","Dashboard",0],
      ["bookings","📋","Reservas",pendingCnt],
      ["calendar","📅","Calendario",0],
      ["precios","💲","Precios",0],
      ["rooms","🏠","Habitaciones",0],
      ["messages","💬","Mensajes",unreadCnt],
      ["finances","💰","Finanzas",0],
      ["reviews","⭐","Reseñas",0],
      ["analytics","📈","Analíticas",0],
      ["settings","⚙️","Config",0],
    ];
    const tabLabel = ([,ic,lbl,n]) => `${ic} ${lbl}${n>0?` (${n})`:""}`;

    // Shared by "Nueva Reserva" and "Editar Reserva" (plain render helpers, not components,
    // so inputs keep focus while typing).
    const setStay = (d, setD, k, v) => {
      const next = {...d,[k]:v};
      if(k==="checkIn" && isYmd(v) && (!isYmd(d.checkOut) || d.checkOut<=v)) next.checkOut = addDays(v,1);
      setD(next);
    };
    const bookingFields = (d, setD, idp, statusOpts) => {
      const sources = !d.source || BOOKING_SOURCES.includes(d.source) ? BOOKING_SOURCES : [...BOOKING_SOURCES, d.source];
      const maxG = Math.max(4, Number(d.guests)||1);
      return(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}} className="mob-full">
          <div style={{gridColumn:"1/-1"}}><FL htmlFor={`${idp}-guest`}>Nombre del Huésped *</FL><Inp id={`${idp}-guest`} maxLength={120} value={d.guest||""} onChange={e=>setD({...d,guest:e.target.value})}/></div>
          <div><FL htmlFor={`${idp}-email`}>Email</FL><Inp id={`${idp}-email`} type="email" maxLength={254} value={d.email||""} onChange={e=>setD({...d,email:e.target.value})}/></div>
          <div><FL htmlFor={`${idp}-phone`}>Teléfono / WhatsApp</FL><Inp id={`${idp}-phone`} type="tel" maxLength={40} value={d.phone||""} onChange={e=>setD({...d,phone:e.target.value})}/></div>
          <div><FL htmlFor={`${idp}-room`}>Habitación *</FL><Sel id={`${idp}-room`} value={d.room} onChange={e=>setD({...d,room:parseInt(e.target.value,10)})}>{rooms.map(r=><option key={r.id} value={r.id}>{r.name} · ${quoteRoom(r).rate}/noche{r.available===false?" (cerrada)":""}</option>)}</Sel></div>
          <div><FL htmlFor={`${idp}-source`}>Fuente</FL><Sel id={`${idp}-source`} value={d.source||"Direct"} onChange={e=>setD({...d,source:e.target.value})}>{sources.map(x=><option key={x} value={x}>{x}</option>)}</Sel></div>
          <div><FL htmlFor={`${idp}-in`}>Check-in *</FL><Inp id={`${idp}-in`} type="date" value={d.checkIn||""} onChange={e=>setStay(d,setD,"checkIn",e.target.value)}/></div>
          <div><FL htmlFor={`${idp}-out`}>Check-out *</FL><Inp id={`${idp}-out`} type="date" min={isYmd(d.checkIn)?addDays(d.checkIn,1):undefined} value={d.checkOut||""} onChange={e=>setStay(d,setD,"checkOut",e.target.value)}/></div>
          <div><FL htmlFor={`${idp}-guests`}>Huéspedes</FL><Sel id={`${idp}-guests`} value={d.guests} onChange={e=>setD({...d,guests:parseInt(e.target.value,10)})}>{Array.from({length:maxG},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}</Sel></div>
          <div><FL htmlFor={`${idp}-status`}>Estado</FL><Sel id={`${idp}-status`} value={d.status} onChange={e=>setD({...d,status:e.target.value})}>{statusOpts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</Sel></div>
          <div style={{gridColumn:"1/-1"}}><FL htmlFor={`${idp}-notes`}>Notas</FL><Inp id={`${idp}-notes`} maxLength={2000} value={d.notes||""} onChange={e=>setD({...d,notes:e.target.value})}/></div>
        </div>
      );
    };
    // Calculated price + the Total that will be saved. Editing only contact details keeps the
    // saved total; a typed total (e.g. the exact Airbnb payout) always wins.
    const totalBox = (original, d, setD, idp) => {
      const q = quoteDraft(d);
      const res = bookingTotals(original, d, ()=>q);
      const n = isYmd(d.checkIn)&&isYmd(d.checkOut) ? nightsBetween(d.checkIn,d.checkOut) : 0;
      const shown = d.totalTouched ? d.total : (Number.isFinite(res.total) ? String(res.total) : "");
      return(
        <div className="price-breakdown" data-testid={`${idp}-price`}>
          {q.valid
            ? <div className="price-row"><span style={{color:C.taupe}}>{q.seasonal?`${q.nights} noche${q.nights!==1?"s":""} · tarifa calculada (con precios especiales)`:`$${q.rate} × ${q.nights} noche${q.nights!==1?"s":""} · tarifa calculada`}</span><span>{fmtMoney(q.total)}</span></div>
            : <div className="price-row"><span style={{color:C.taupe}}>{n<1&&isYmd(d.checkIn)&&isYmd(d.checkOut)?"La salida debe ser después de la entrada.":"Elige las fechas para calcular el precio."}</span></div>}
          <div style={{display:"flex",alignItems:"flex-end",gap:".75rem",marginTop:".6rem",flexWrap:"wrap"}}>
            <div style={{flex:"1 1 160px"}}>
              <FL htmlFor={`${idp}-total`}>Total a guardar ($)</FL>
              <Inp id={`${idp}-total`} inputMode="decimal" value={shown} onChange={e=>setD({...d,total:e.target.value,totalTouched:true})} placeholder="0.00"/>
            </div>
            {n>0&&<div style={{fontFamily:"'Lato',sans-serif",fontSize:".8rem",color:C.ebony,paddingBottom:".7rem"}} data-testid={`${idp}-nights`}>{n} noche{n!==1?"s":""}</div>}
          </div>
          {d.totalTouched&&q.valid&&<button type="button" onClick={()=>setD({...d,total:"",totalTouched:false})} style={{background:"none",border:"none",color:C.goldText,textDecoration:"underline",cursor:"pointer",padding:".4rem 0 0",fontFamily:"'Lato',sans-serif",fontSize:".74rem"}}>↺ Usar el precio calculado ({fmtMoney(q.total)})</button>}
          <div style={{fontFamily:"'Lato',sans-serif",fontSize:".7rem",color:C.taupe,marginTop:".35rem",lineHeight:1.5}}>
            {original&&!res.stayChanged&&!d.totalTouched?"Se mantiene el total guardado; solo se recalcula si cambias la habitación o las fechas. ":""}
            Para Airbnb/Booking escribe el pago exacto que recibes.
          </div>
        </div>
      );
    };

    return(
      <div style={{fontFamily:"'Cormorant Garamond',serif",display:"flex",minHeight:"100vh",background:C.smoke}}>
        <style>{css}</style>
        {toast&&<div className="toast">{toast}</div>}

        {/* Sidebar */}
        <div style={{background:C.ebony,width:220,flexShrink:0,display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",overflowY:"auto"}} className="mob-hide">
          <div style={{padding:"1.5rem",borderBottom:`1px solid ${C.mahogany}50`}}>
            <div style={{color:C.gold,fontSize:"1.1rem",fontWeight:600,letterSpacing:".1em"}}>CAONABO 35</div>
            <div style={{color:C.taupe,fontSize:".55rem",fontFamily:"'Lato',sans-serif",letterSpacing:".2em",marginTop:".18rem"}}>GESTIÓN</div>
          </div>
          <div style={{flex:1,paddingTop:".4rem"}}>
            {adminTabs.map(tab=>(
              <div key={tab[0]} className={`sb${adminTab===tab[0]?" act":""}`} onClick={()=>setAdminTab(tab[0])}>{tabLabel(tab)}</div>
            ))}
          </div>
          <div style={{borderTop:`1px solid ${C.mahogany}50`,paddingBottom:".5rem"}}>
            <div className="sb" onClick={printReport}>🖨️ Imprimir Reporte</div>
            <div className="sb" onClick={viewPublicSite}>🌐 Ver Sitio Público</div>
            <div className="sb" onClick={adminLogout}>🚪 Cerrar Sesión</div>
          </div>
        </div>

        {/* Mobile tab bar — every tab, scrolls sideways */}
        <nav aria-label="Secciones" style={{position:"fixed",bottom:0,left:0,right:0,background:C.ebony,zIndex:100,borderTop:`1px solid ${C.mahogany}50`,display:"none",paddingBottom:"env(safe-area-inset-bottom)"}} className="mob-tabbar">
          <div className="mtabs">
            {adminTabs.map(([id,ic,lbl,n])=>(
              <button key={id} type="button" className={`mtab${adminTab===id?" act":""}`} aria-current={adminTab===id?"page":undefined} onClick={()=>setAdminTab(id)}>
                <span className="ic" aria-hidden="true">{ic}</span><span>{lbl}{n>0?` (${n})`:""}</span>
              </button>
            ))}
            <span style={{flex:"0 0 22px"}}/>
          </div>
          <span className="mtab-fade" aria-hidden="true"/>
        </nav>

        {/* Main content */}
        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
          <div className="adm-head mob-p" style={{background:C.white,padding:"1rem 1.75rem",borderBottom:`1px solid ${C.parchment}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:50,flexWrap:"wrap",gap:".5rem"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:".5rem",flex:"1 1 auto",minWidth:0}}>
              <h1 style={{margin:0,fontSize:"1.2rem",fontWeight:400,color:C.ebony,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tabLabel(adminTabs.find(x=>x[0]===adminTab)||adminTabs[0])}</h1>
              <div className="mob-only" style={{gap:".4rem",flexShrink:0}}>
                <button type="button" className="adm-hbtn" onClick={viewPublicSite} aria-label="Ver sitio público">🌐 Sitio</button>
                <button type="button" className="adm-hbtn" onClick={adminLogout}>🚪 Salir</button>
              </div>
            </div>
            <div style={{display:"flex",gap:".5rem",alignItems:"center",flexWrap:"wrap"}}>
              {pendingCnt>0&&<span style={{background:C.gold,color:C.ebony,borderRadius:20,padding:".15rem .7rem",fontSize:".67rem",fontFamily:"'Lato',sans-serif",fontWeight:700}}>{pendingCnt} pendiente{pendingCnt>1?"s":""}</span>}
              {unreadCnt>0&&<span style={{background:"#1565C0",color:"#fff",borderRadius:20,padding:".15rem .7rem",fontSize:".67rem",fontFamily:"'Lato',sans-serif",fontWeight:700}}>{unreadCnt} nuevo{unreadCnt>1?"s":""}</span>}
              {unpaid>0&&<span style={{background:C.danger,color:"#fff",borderRadius:20,padding:".15rem .7rem",fontSize:".67rem",fontFamily:"'Lato',sans-serif",fontWeight:700}}>{fmtMoney(unpaid)} por pagar</span>}
            </div>
          </div>

          <div style={{padding:"1.75rem",flex:1}} className="mob-p mob-pb">

          {/* ── DASHBOARD ── */}
          {adminTab==="dashboard"&&(<div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:"1rem",marginBottom:"1.75rem"}} className="mob-2col">
              {[[fmtMoney(totalRev),"Ingresos Brutos",C.warm],[fmtMoney(netRev),"Beneficio Neto",netRev>=0?C.olive:C.danger],[`${occupiedToday}/${rooms.length}`,"Ocupación Hoy","#1565C0"],[pendingCnt,"Por Confirmar",C.warning],[fmtMoney(unpaid),"Por Cobrar",unpaid>0?C.danger:C.olive],[bookings.filter(b=>b.source==="Direct"&&isRev(b)).length,"Directas",C.olive]].map(([v,l,col])=>(
                <div key={l} className="stat" style={{borderTopColor:col}}><div className="stat-v" style={{color:col}}>{v}</div><div className="stat-l">{l}</div></div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:"1.5rem",marginBottom:"1.5rem"}} className="mob-full">
              <div className="card" style={{padding:"1.4rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
                  <h3 style={{fontFamily:"'Lato',sans-serif",fontSize:".77rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm}}>Reservas Recientes</h3>
                  <button className="btn-sm-o" onClick={()=>setAdminTab("bookings")}>Ver todas</button>
                </div>
                {bookings.slice(0,6).map(b=>(
                  <div key={b.id} onClick={()=>{setAdminTab("bookings");setDetailB(b);}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:".58rem 0",borderBottom:`1px solid ${C.smoke}`,cursor:"pointer"}}>
                    <div><div style={{fontFamily:"'Lato',sans-serif",fontSize:".84rem",fontWeight:700,color:C.ebony}}>{b.guest}</div><div style={{fontFamily:"'Lato',sans-serif",fontSize:".71rem",color:C.taupe}}>{rooms.find(r=>r.id===b.room)?.name} · {b.checkIn}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontFamily:"'Lato',sans-serif",fontWeight:700,color:C.warm,fontSize:".86rem"}}>{fmtMoney(b.total)}</div><Bdg s={b.status}/></div>
                  </div>
                ))}
                <button className="btn-sm" style={{marginTop:"1rem",width:"100%"}} onClick={()=>{setAdminTab("bookings");setNewBookModal(true);}}>+ Nueva Reserva</button>
              </div>
              <div className="card" style={{padding:"1.4rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
                  <h3 style={{fontFamily:"'Lato',sans-serif",fontSize:".77rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm}}>Habitaciones Hoy</h3>
                  <button className="btn-sm-o" onClick={()=>setAdminTab("rooms")}>Gestionar</button>
                </div>
                {rooms.map(rm=>{
                  const ab=bookings.find(b=>b.room===rm.id&&isRev(b)&&b.checkIn<=TODAY&&b.checkOut>TODAY);
                  const ci=bookings.find(b=>b.room===rm.id&&isRev(b)&&b.checkIn===TODAY);
                  const co=bookings.find(b=>b.room===rm.id&&isRev(b)&&b.checkOut===TODAY);
                  return(
                    <div key={rm.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:".52rem 0",borderBottom:`1px solid ${C.smoke}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:".6rem"}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:!rm.available?"#999":ab?C.danger:"#43a047",flexShrink:0}}/>
                        <span style={{fontFamily:"'Lato',sans-serif",fontSize:".81rem",color:C.ebony}}>{rm.name}</span>
                      </div>
                      <div style={{display:"flex",gap:".3rem",alignItems:"center"}}>
                        {ci&&<span style={{fontSize:".58rem",background:C.warningBg,color:C.warning,padding:".06rem .4rem",fontFamily:"'Lato',sans-serif",fontWeight:700}}>ENTRA</span>}
                        {co&&<span style={{fontSize:".58rem",background:C.successBg,color:C.success,padding:".06rem .4rem",fontFamily:"'Lato',sans-serif",fontWeight:700}}>SALE</span>}
                        <span style={{fontFamily:"'Lato',sans-serif",fontSize:".73rem",color:!rm.available?C.taupe:ab?C.danger:"#43a047"}}>{!rm.available?"Bloqueada":ab?ab.guest.split(" ")[0]:"Libre"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {(pendingCnt>0||unpaid>0)&&(
              <div className="card" style={{padding:"1.4rem"}}>
                <h3 style={{fontFamily:"'Lato',sans-serif",fontSize:".77rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm,marginBottom:"1rem"}}>⚠ Requieren Atención</h3>
                <div style={{display:"flex",flexDirection:"column",gap:".6rem"}}>
                  {bookings.filter(b=>b.status==="pending").map(b=>(
                    <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:".7rem 1rem",background:C.warningBg,borderLeft:`3px solid ${C.warning}`,flexWrap:"wrap",gap:".5rem"}}>
                      <span style={{fontFamily:"'Lato',sans-serif",fontSize:".83rem"}}><strong>{b.guest}</strong> · {rooms.find(r=>r.id===b.room)?.name} · {b.checkIn} → {b.checkOut} · <strong>{fmtMoney(b.total)}</strong></span>
                      <div style={{display:"flex",gap:".4rem"}}>
                        <button className="btn-success" onClick={()=>updateBookingStatus(b.id,"confirmed")}>✓ Confirmar</button>
                        <button className="btn-danger" onClick={()=>updateBookingStatus(b.id,"cancelled")}>✗ Cancelar</button>
                        <button className="btn-sm-o" onClick={()=>setEditBooking({...b})}>Editar</button>
                      </div>
                    </div>
                  ))}
                  {confirmed.filter(b=>!b.paid).map(b=>(
                    <div key={b.id+"p"} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:".7rem 1rem",background:C.dangerBg,borderLeft:`3px solid ${C.danger}`,flexWrap:"wrap",gap:".5rem"}}>
                      <span style={{fontFamily:"'Lato',sans-serif",fontSize:".83rem",color:C.danger}}><strong>{b.guest}</strong> · Pago pendiente · <strong>{fmtMoney(b.total)}</strong></span>
                      <button className="btn-success" onClick={()=>markPaid(b.id)}>✓ Pagado</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>)}


          {/* ── BOOKINGS ── */}
          {adminTab==="bookings"&&(<div>
            <div style={{display:"flex",gap:".6rem",marginBottom:"1.4rem",flexWrap:"wrap",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",gap:".35rem",flexWrap:"wrap",overflowX:"auto"}}>
                {["all","confirmed","checked_in","finalizada","pending","cancelled"].map(s=>(
                  <button key={s} className={`tog${filterStatus===s?" act":""}`} onClick={()=>setFilterStatus(s)}>
                    {s==="all"?"Todas":s==="confirmed"?"Confirmadas":s==="checked_in"?"🏨 En Hotel":s==="finalizada"?"Finalizadas":s==="pending"?"Pendientes":"Canceladas"}
                    <span style={{opacity:.65,marginLeft:".3rem"}}>({bookings.filter(b=>s==="all"||b.status===s).length})</span>
                  </button>
                ))}
              </div>
              <button className="btn-gold" style={{padding:".6rem 1.3rem",fontSize:".7rem"}} onClick={()=>{setNewBookModal(true);setNewBError("");}}>+ Nueva Reserva</button>
            </div>
            <div className="card" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"'Lato',sans-serif",fontSize:".78rem"}}>
                <thead>
                  <tr>{["#","Huésped","Habitación","Entrada","Salida","Noches","Total","Estado","Pago","Fuente","Acciones"].map(h=>(
                    <th key={h} style={{background:C.ebony,color:C.parchment,padding:".72rem .85rem",textAlign:"left",fontSize:".6rem",letterSpacing:".1em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {filtB.map((b,i)=>{
                    const n=b.checkIn&&b.checkOut?nights(b.checkIn,b.checkOut):"-";
                    return(
                      <tr key={b.id} className="tr" style={{background:i%2===0?C.white:C.smoke}} onClick={()=>setDetailB(b)}>
                        <td style={{padding:".65rem .85rem",color:C.taupe,fontSize:".7rem"}}>#{b.id}</td>
                        <td style={{padding:".65rem .85rem"}}><div style={{fontWeight:700,color:C.ebony}}>{b.guest}</div><div style={{fontSize:".7rem",color:C.taupe}}>{b.phone}</div></td>
                        <td style={{padding:".65rem .85rem",color:C.ebony,whiteSpace:"nowrap"}}>{rooms.find(r=>r.id===b.room)?.name}</td>
                        <td style={{padding:".65rem .85rem",color:C.ebony,whiteSpace:"nowrap"}}>{b.checkIn}</td>
                        <td style={{padding:".65rem .85rem",color:C.ebony,whiteSpace:"nowrap"}}>{b.checkOut}</td>
                        <td style={{padding:".65rem .85rem",color:C.taupe,textAlign:"center"}}>{n}</td>
                        <td style={{padding:".65rem .85rem",fontWeight:700,color:C.warm}}>{fmtMoney(b.total)}</td>
                        <td style={{padding:".65rem .85rem"}}><Bdg s={b.status}/></td>
                        <td style={{padding:".65rem .85rem"}}>{b.paid?<span style={{color:C.success,fontWeight:700,fontSize:".7rem"}}>✓ Pagado</span>:<button className="btn-success" style={{fontSize:".6rem",padding:".2rem .5rem"}} onClick={e=>{e.stopPropagation();markPaid(b.id);}}>Pagado</button>}</td>
                        <td style={{padding:".65rem .85rem",color:C.taupe,fontSize:".75rem"}}>{b.source}</td>
                        <td style={{padding:".65rem .85rem"}} onClick={e=>e.stopPropagation()}>
                          <div style={{display:"flex",gap:".25rem",flexWrap:"wrap"}}>
                            <button className="btn-sm-o" style={{fontSize:".58rem",padding:".2rem .5rem"}} onClick={()=>{setEditBooking({...b});setEditBError("");}}>✏️</button>
                            {b.status==="pending"&&<><button className="btn-success" style={{fontSize:".58rem",padding:".2rem .45rem"}} onClick={()=>updateBookingStatus(b.id,"confirmed")}>✓</button><button className="btn-danger" style={{fontSize:".58rem",padding:".2rem .45rem"}} onClick={()=>updateBookingStatus(b.id,"cancelled")}>✗</button></>}
                            {waLinkFor(b.phone)&&<a href={waLinkFor(b.phone)} target="_blank" rel="noopener noreferrer" className="btn-sm-o" style={{fontSize:".58rem",padding:".2rem .45rem",textDecoration:"none"}}>WA</a>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{background:C.white,padding:".9rem 1.5rem",borderTop:`2px solid ${C.gold}`,display:"flex",gap:"2rem",fontFamily:"'Lato',sans-serif",fontSize:".8rem",flexWrap:"wrap"}}>
              <span>Total: <strong style={{color:C.warm}}>{fmtMoney(filtB.filter(isRev).reduce((s,b)=>s+b.total,0))}</strong></span>
              <span>Pagado: <strong style={{color:C.success}}>{fmtMoney(filtB.filter(b=>b.paid).reduce((s,b)=>s+b.total,0))}</strong></span>
              <span>Por pagar: <strong style={{color:C.danger}}>{fmtMoney(filtB.filter(b=>!b.paid&&isRev(b)).reduce((s,b)=>s+b.total,0))}</strong></span>
            </div>
          </div>)}

          {/* ── CALENDAR — single month with nav ── */}
          {adminTab==="calendar"&&(<div>
            {/* Today's activity — arrivals / departures / in-house, always visible */}
            {(()=>{
              const active=bookings.filter(b=>b.status!=="cancelled");
              const rn=id=>rooms.find(r=>r.id===id)?.name||("Hab. "+id);
              const cols=[
                ["Llegadas hoy","#2e7d32",active.filter(b=>b.checkIn===TODAY),"Sin llegadas"],
                ["Salidas hoy","#c62828",active.filter(b=>b.checkOut===TODAY),"Sin salidas"],
                ["En hotel ahora","#1565C0",active.filter(b=>b.checkIn<=TODAY&&b.checkOut>TODAY),"Sin huéspedes"],
              ];
              return(
                <div style={{marginBottom:"1.3rem"}}>
                  <h3 style={{fontFamily:"'Lato',sans-serif",fontSize:".75rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm,margin:"0 0 .7rem"}}>Hoy · {TODAY}</h3>
                  <div style={{display:"flex",gap:".8rem",flexWrap:"wrap"}}>
                    {cols.map(([title,color,list,empty])=>(
                      <div key={title} style={{flex:"1 1 200px",minWidth:190,background:C.white,border:`1px solid ${C.parchment}`,borderTop:`3px solid ${color}`,borderRadius:6,padding:".9rem 1rem"}}>
                        <div style={{fontFamily:"'Lato',sans-serif",fontSize:".64rem",letterSpacing:".1em",textTransform:"uppercase",color,fontWeight:700,marginBottom:".6rem"}}>{title} ({list.length})</div>
                        {list.length===0?<div style={{fontSize:".76rem",color:C.taupe,fontStyle:"italic"}}>{empty}</div>:list.map(b=>(
                          <div key={b.id} onClick={()=>setDetailB(b)} style={{display:"flex",justifyContent:"space-between",gap:".5rem",padding:".32rem 0",borderBottom:`1px solid ${C.smoke}`,cursor:"pointer",fontSize:".78rem"}}>
                            <span style={{color:C.ebony,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{b.guest}</span>
                            <span style={{color:C.taupe,whiteSpace:"nowrap"}}>{rn(b.room)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Search across ALL reservations (past + present) */}
            <div style={{marginBottom:"1.2rem"}}>
              <input className="inp" placeholder="🔎 Buscar todas las reservas: nombre, email, teléfono, habitación, fecha, estado..." value={resSearch} onChange={e=>setResSearch(e.target.value)} style={{maxWidth:580}}/>
              {resSearch.trim()&&(()=>{
                const q=resSearch.trim().toLowerCase();
                const rn=id=>rooms.find(r=>r.id===id)?.name||"";
                const hits=bookings.filter(b=>[b.guest,b.email,b.phone,rn(b.room),b.checkIn,b.checkOut,b.status,b.source,b.total,b.id].some(f=>String(f??"").toLowerCase().includes(q)));
                return(
                  <div className="card" style={{marginTop:".7rem",overflowX:"auto"}}>
                    <div style={{padding:".5rem .85rem",fontFamily:"'Lato',sans-serif",fontSize:".7rem",color:C.taupe,borderBottom:`1px solid ${C.parchment}`}}>{hits.length} resultado{hits.length!==1?"s":""}</div>
                    {hits.length===0?<div style={{padding:"1rem",color:C.taupe,fontSize:".8rem"}}>Sin coincidencias.</div>:
                    <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"'Lato',sans-serif",fontSize:".76rem"}}>
                      <thead><tr>{["#","Huésped","Contacto","Habitación","Entrada","Salida","Total","Estado"].map(h=><th key={h} style={{background:C.ebony,color:C.parchment,padding:".5rem .7rem",textAlign:"left",fontSize:".57rem",letterSpacing:".08em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                      <tbody>
                        {hits.map((b,i)=>(
                          <tr key={b.id} className="tr" onClick={()=>setDetailB(b)} style={{background:i%2?C.smoke:C.white,cursor:"pointer"}}>
                            <td style={{padding:".45rem .7rem",color:C.taupe,whiteSpace:"nowrap"}}>#{b.id}</td>
                            <td style={{padding:".45rem .7rem",fontWeight:700,color:C.ebony,whiteSpace:"nowrap"}}>{b.guest}</td>
                            <td style={{padding:".45rem .7rem",color:C.taupe,fontSize:".7rem"}}>{b.email}<br/>{b.phone}</td>
                            <td style={{padding:".45rem .7rem",color:C.ebony,whiteSpace:"nowrap"}}>{rn(b.room)}</td>
                            <td style={{padding:".45rem .7rem",whiteSpace:"nowrap"}}>{b.checkIn}</td>
                            <td style={{padding:".45rem .7rem",whiteSpace:"nowrap"}}>{b.checkOut}</td>
                            <td style={{padding:".45rem .7rem",fontWeight:700,color:C.warm,whiteSpace:"nowrap"}}>{fmtMoney(b.total)}</td>
                            <td style={{padding:".45rem .7rem"}}><Bdg s={b.status}/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>}
                  </div>
                );
              })()}
            </div>

            {/* View toggle: month reservations vs per-night price calendar */}
            <div style={{display:"flex",gap:".4rem",marginBottom:"1.2rem",flexWrap:"wrap"}}>
              {[["mes","📅 Reservas del mes"],["precios","💲 Precios por noche"]].map(([v,l])=>(
                <button key={v} onClick={()=>setCalView(v)} className={`tog${calView===v?" act":""}`}>{l}</button>
              ))}
            </div>

            {calView==="mes"&&(<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem",flexWrap:"wrap",gap:".75rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:".6rem",flexWrap:"wrap"}}>
                <button className="btn-sm-o" style={{padding:".42rem .85rem"}} onClick={calNavPrev} aria-label="Mes anterior">←</button>
                <h2 style={{fontSize:"1.15rem",fontWeight:400,color:C.ebony,minWidth:150,textAlign:"center"}}>{calTitle}</h2>
                <button className="btn-sm-o" style={{padding:".42rem .85rem"}} onClick={calNavNext} aria-label="Mes siguiente">→</button>
                <button className="btn-sm-o" style={{padding:".42rem .85rem"}} onClick={()=>{setCalYear(Number(TODAY.slice(0,4)));setCalMonth(Number(TODAY.slice(5,7))-1);}}>Hoy</button>
              </div>
              <div style={{display:"flex",gap:".75rem",alignItems:"center",flexWrap:"wrap"}}>
                <div style={{display:"flex",gap:".65rem",fontFamily:"'Lato',sans-serif",fontSize:".68rem",color:C.taupe,alignItems:"center"}}>
                  <span style={{display:"flex",alignItems:"center",gap:".3rem"}}><span style={{width:10,height:10,background:"#f0f7f0",border:"1px solid #c8e6c9",borderRadius:2,display:"inline-block"}}/> Ocupado</span>
                  <span style={{display:"flex",alignItems:"center",gap:".3rem"}}><span style={{width:10,height:10,background:"#fff8e1",border:"1px solid #ffe082",borderRadius:2,display:"inline-block"}}/> Pendiente</span>
                  <span style={{display:"flex",alignItems:"center",gap:".3rem"}}><span style={{width:10,height:10,background:C.goldLight,border:`2px solid ${C.gold}`,borderRadius:2,display:"inline-block"}}/> Hoy</span>
                </div>
                <button className="btn-gold" style={{padding:".55rem 1.2rem",fontSize:".7rem"}} onClick={()=>{setNewBookModal(true);setNewBError("");}}>+ Nueva Reserva</button>
              </div>
            </div>

            <div className="card" style={{padding:"1rem"}}>
              {/* Day headers */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
                {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map(d=>(
                  <div key={d} style={{textAlign:"center",fontSize:".65rem",fontFamily:"'Lato',sans-serif",color:C.taupe,padding:".3rem 0",fontWeight:700}}>{d}</div>
                ))}
              </div>
              {/* Day cells */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
                {Array.from({length:totalCells},(_,i)=>{
                  const dayNum=i-fd+1;
                  if(dayNum<1||dayNum>dim) return <div key={i} style={{minHeight:70}}/>;
                  const dateStr=fmtDate(calYear,calMonth,dayNum);
                  const dbs=dayBookings(calYear,calMonth,dayNum);
                  const isToday=dateStr===TODAY;
                  const hasPend=bookings.some(b=>b.checkIn<=dateStr&&b.checkOut>dateStr&&b.status==="pending");
                  let bg=C.white,border=`1px solid ${C.parchment}`;
                  if(isToday){bg=C.goldLight;border=`2px solid ${C.gold}`;}
                  else if(hasPend){bg="#fff8e1";border="1px solid #ffe082";}
                  else if(dbs.length>0){bg="#f0f7f0";border="1px solid #c8e6c9";}
                  return(
                    <div key={i} className="day-cell" style={{background:bg,border,minHeight:70,padding:"3px"}}
                      onClick={()=>{
                        const dayBs=bookings.filter(b=>b.checkIn<=dateStr&&b.checkOut>dateStr&&b.status!=="cancelled");
                        if(dayBs.length===1){setDetailB(dayBs[0]);}
                        else{setNewB({...EMPTY_NEW_BOOKING,checkIn:dateStr,checkOut:addDays(dateStr,1)});setNewBookModal(true);setNewBError("");}
                      }}>
                      <div style={{textAlign:"center",fontSize:".7rem",fontFamily:"'Lato',sans-serif",color:isToday?C.ebony:dbs.length>0?C.success:C.taupe,fontWeight:isToday||dbs.length>0?700:400,marginBottom:2}}>{dayNum}</div>
                      {dbs.slice(0,2).map(b=>(
                        <div key={b.id} className="chip"
                          style={{background:ROOM_COLORS[(b.room-1)%ROOM_COLORS.length]}}
                          onClick={e=>{e.stopPropagation();setDetailB(b);}}>
                          {rooms.find(r=>r.id===b.room)?.name.split(" ").pop()?.substring(0,6)} · {b.guest.split(" ")[0]}
                        </div>
                      ))}
                      {dbs.length>2&&<div style={{fontSize:".5rem",color:C.warm,fontFamily:"'Lato',sans-serif",textAlign:"center"}}>+{dbs.length-2}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Occupancy for this month */}
            <div className="card" style={{padding:"1.4rem",marginTop:"1.25rem"}}>
              <h3 style={{fontFamily:"'Lato',sans-serif",fontSize:".77rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm,marginBottom:"1.1rem"}}>Ocupación — {calTitle}</h3>
              {rooms.map((rm,ri)=>{
                let occ=0;
                for(let d=1;d<=dim;d++) if(dayBookings(calYear,calMonth,d).some(b=>b.room===rm.id)) occ++;
                const pct=Math.round((occ/dim)*100);
                return(
                  <div key={rm.id} style={{marginBottom:".85rem"}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontFamily:"'Lato',sans-serif",fontSize:".79rem",marginBottom:".22rem"}}>
                      <span style={{color:C.ebony}}>{rm.name}</span>
                      <span style={{color:pct<30?C.danger:pct<60?C.gold:C.olive,fontWeight:700}}>{rm.available?`${pct}%`:"Bloqueada"}</span>
                    </div>
                    <div style={{background:C.parchment,height:8}}><div style={{background:ROOM_COLORS[ri%ROOM_COLORS.length],width:`${pct}%`,height:"100%",transition:"width .5s"}}/></div>
                  </div>
                );
              })}
            </div>
            </>)}

            {calView==="precios"&&(<div>
              <p style={{color:C.taupe,fontFamily:"'Lato',sans-serif",fontSize:".74rem",marginTop:0,marginBottom:"1.1rem"}}>Precio de cada noche. Clic en una celda para esa noche, o usa "Editar en bloque" para un rango. Las tarifas temporales aparecen en azul.</p>
              <MultiCalendar rooms={rooms} bookings={bookings} supabase={supabase} showToast={showToast} today={TODAY} seasons={seasons} channelBlocks={channelBlocks} refreshKey={gridVersion} />
            </div>)}
          </div>)}

          {/* ── ROOMS ── */}
          {adminTab==="rooms"&&(<div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"1.25rem"}}>
              {rooms.map(rm=>{
                const rev=bookings.filter(b=>b.room===rm.id&&isRev(b)).reduce((s,b)=>s+b.total,0);
                const ab=bookings.find(b=>b.room===rm.id&&isRev(b)&&b.checkIn<=TODAY&&b.checkOut>TODAY);
                const upcoming=bookings.filter(b=>b.room===rm.id&&isRev(b)&&b.checkIn>TODAY).length;
                return(
                  <div key={rm.id} className="card" style={{overflow:"hidden"}}>
                    <div style={{height:130,position:"relative",overflow:"hidden"}}>
                      <img src={coverPhoto(rm)} alt={rm.name} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(26,15,8,.8),transparent 50%)"}}/>
                      <div style={{position:"absolute",bottom:"1rem",left:"1rem"}}>
                        <div style={{color:C.ivory,fontSize:"1rem",fontWeight:500}}>{rm.name}</div>
                        <div style={{color:C.goldLight,fontSize:".68rem",fontFamily:"'Lato',sans-serif"}}>{rm.beds} · {rm.size}</div>
                      </div>
                      <div style={{position:"absolute",top:".7rem",right:".7rem",background:rm.available?(ab?C.danger:"#43a047"):"#888",color:"#fff",padding:".15rem .55rem",fontSize:".6rem",fontFamily:"'Lato',sans-serif",fontWeight:700}}>
                        {rm.available?(ab?"OCUPADA":"LIBRE"):"BLOQUEADA"}
                      </div>
                    </div>
                    <div style={{padding:"1.1rem"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".65rem"}}>
                        <span style={{fontSize:"1.5rem",fontWeight:700,color:rm.discount>0?C.gold:C.warm}}>{rm.discount>0&&<span style={{fontSize:".72rem",color:C.taupe,fontWeight:400,textDecoration:"line-through",marginRight:".3rem"}}>{"$"+rm.price}</span>}{"$"+(rm.discount>0?Math.round(rm.price*(1-rm.discount/100)):rm.price)}<span style={{fontSize:".75rem",color:C.taupe,fontWeight:400}}>/noche</span>{rm.discount>0&&<span style={{background:C.gold,color:C.ebony,fontSize:".6rem",fontWeight:700,padding:".1rem .3rem",marginLeft:".3rem"}}>{"- "+rm.discount+"%"}</span>}</span>
                        <span style={{fontFamily:"'Lato',sans-serif",fontSize:".75rem",color:C.olive,fontWeight:700}}>{fmtMoney(rev)}</span>
                      </div>
                      {upcoming>0&&<div style={{fontFamily:"'Lato',sans-serif",fontSize:".72rem",color:"#1565C0",marginBottom:".6rem"}}>{upcoming} reserva{upcoming>1?"s":""} próxima{upcoming>1?"s":""}</div>}
                      <div style={{display:"flex",flexWrap:"wrap",gap:".28rem",marginBottom:".85rem"}}>
                        {rm.amenities.map(a=><span key={a} style={{background:C.smoke,color:C.warm,padding:".17rem .6rem",fontSize:".64rem",fontFamily:"'Lato',sans-serif",borderRadius:20}}>{a}</span>)}
                      </div>
                      <button className="btn-sm" style={{width:"100%"}} onClick={()=>{setEditRoom(rm);setEditRoomD({...rm,amenities:[...rm.amenities]});}}>✏️ Editar Habitación</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>)}

          {/* ── MESSAGES ── */}
          {adminTab==="messages"&&(<div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
              <p style={{fontFamily:"'Lato',sans-serif",fontSize:".82rem",color:C.taupe}}>{unreadCnt} sin leer · {messages.length} total</p>
              <button className="btn-gold" style={{padding:".6rem 1.3rem",fontSize:".7rem"}} onClick={()=>setAddMsgModal(true)}>+ Nuevo Mensaje</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              {messages.map(m=>(
                <div key={m.id} className="card" style={{padding:"1.4rem 1.7rem",borderLeft:`4px solid ${m.read?C.parchment:C.gold}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:".65rem",flexWrap:"wrap",gap:".5rem"}}>
                    <div style={{display:"flex",gap:".7rem",alignItems:"center",flexWrap:"wrap"}}>
                      <span style={{fontFamily:"'Lato',sans-serif",fontWeight:700,color:C.ebony}}>{m.guest}</span>
                      <span style={{fontFamily:"'Lato',sans-serif",fontSize:".74rem",color:C.taupe}}>{[m.email,m.phone].filter(Boolean).join(" · ")}</span>
                      {!m.read&&<span style={{background:C.gold,color:C.ebony,padding:".1rem .5rem",borderRadius:20,fontSize:".62rem",fontFamily:"'Lato',sans-serif",fontWeight:700}}>NUEVO</span>}
                    </div>
                    <span style={{fontFamily:"'Lato',sans-serif",fontSize:".73rem",color:C.taupe}}>{m.date}</span>
                  </div>
                  <p style={{fontStyle:"italic",color:C.ebony,lineHeight:1.7,marginBottom:".9rem"}}>"{m.message}"</p>
                  <div style={{display:"flex",gap:".5rem",flexWrap:"wrap"}}>
                    <button className="btn-sm" onClick={()=>{setReplyModal(m);setReplyTxt("");markMessageRead(m.id);}}>Responder</button>
                    {waLinkFor(m.phone)&&<a href={waLinkFor(m.phone)} target="_blank" rel="noopener noreferrer" className="btn-sm-o" style={{textDecoration:"none"}}>WhatsApp</a>}
                    {m.email&&<a href={`mailto:${m.email}`} className="btn-sm-o" style={{textDecoration:"none"}}>Email</a>}
                    {!m.read&&<button className="btn-sm-o" onClick={()=>markMessageRead(m.id)}>Marcar leído</button>}
                    <button style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontFamily:"'Lato',sans-serif",fontSize:".7rem"}} onClick={()=>deleteMessage(m.id)}>Eliminar</button>
                  </div>
                </div>
              ))}
              {messages.length===0&&<p style={{fontFamily:"'Lato',sans-serif",color:C.taupe,fontStyle:"italic",textAlign:"center",padding:"2rem"}}>No hay mensajes</p>}
            </div>
          </div>)}


          {/* ── FINANCES ── */}
          {adminTab==="finances"&&(()=>{
            const CATS=["Todas","Limpieza","Mantenimiento","Suministros","Servicios","Comisiones","Marketing","Otros"];
            const filtExp = expFilter==="all" ? expenses : expenses.filter(e=>e.category===expFilter);
            const pendExp = expenses.filter(e=>!e.paid).reduce((s,e)=>s+e.amount,0);
            return(<div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:"1rem",marginBottom:"1.75rem"}} className="mob-2col">
                {[[fmtMoney(totalRev),"Ingresos Brutos",C.warm],[fmtMoney(totalExp),"Total Gastos",C.danger],[fmtMoney(netRev),"Beneficio Neto",netRev>=0?C.olive:C.danger],[fmtMoney(confirmed.filter(b=>b.paid).reduce((s,b)=>s+b.total,0)),"Pagado",C.olive],[fmtMoney(pendExp),"Gastos Pend.",pendExp>0?C.warning:C.olive],[expenses.length,"Nº Gastos",C.taupe]].map(([v,l,col])=>(
                  <div key={l} className="stat" style={{borderTopColor:col}}><div className="stat-v" style={{color:col}}>{v}</div><div className="stat-l">{l}</div></div>
                ))}
              </div>

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:".5rem"}}>
                <div style={{display:"flex",gap:".3rem",flexWrap:"wrap"}}>
                  {CATS.map(c=>(
                    <button key={c} className={"tog"+(expFilter===(c==="Todas"?"all":c)?" act":"")} onClick={()=>setExpFilter(c==="Todas"?"all":c)} style={{fontSize:".62rem",padding:".35rem .75rem"}}>{c}</button>
                  ))}
                </div>
                <button className="btn-gold" style={{padding:".55rem 1.2rem",fontSize:".7rem"}} onClick={()=>setAddExpModal(true)}>+ Nuevo Gasto</button>
              </div>

              <div className="card" style={{overflowX:"auto",WebkitOverflowScrolling:"touch",marginBottom:"1.5rem"}}>
                {expensesLoading?(
                  <div style={{padding:"2rem",textAlign:"center",fontFamily:"'Lato',sans-serif",color:C.taupe}}>Cargando gastos...</div>
                ):filtExp.length===0?(
                  <div style={{padding:"2rem",textAlign:"center",fontFamily:"'Lato',sans-serif",color:C.taupe}}>No hay gastos registrados.</div>
                ):(
                  <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"'Lato',sans-serif",fontSize:".82rem"}}>
                    <thead>
                      <tr>{["Fecha","Categoría","Descripción","Monto","Estado","Acciones"].map(h=>(
                        <th key={h} style={{background:C.ebony,color:C.parchment,padding:".65rem .85rem",textAlign:"left",fontSize:".6rem",letterSpacing:".1em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {filtExp.map((e,i)=>(
                        <tr key={e.id} style={{background:i%2===0?C.white:C.smoke}}>
                          <td style={{padding:".65rem .85rem",color:C.taupe,whiteSpace:"nowrap"}}>{e.date}</td>
                          <td style={{padding:".65rem .85rem"}}>
                            <span style={{background:C.smoke,color:C.ebony,padding:".15rem .55rem",borderRadius:20,fontSize:".68rem",fontWeight:600}}>{e.category}</span>
                          </td>
                          <td style={{padding:".65rem .85rem",color:C.ebony}}>{e.desc}</td>
                          <td style={{padding:".65rem .85rem",fontWeight:700,color:C.danger,whiteSpace:"nowrap"}}>{fmtMoney(e.amount)}</td>
                          <td style={{padding:".65rem .85rem"}}>
                            {e.paid
                              ?<span style={{color:C.success,fontWeight:700,fontSize:".73rem"}}>✓ Pagado</span>
                              :<button className="btn-success" style={{fontSize:".62rem",padding:".22rem .55rem"}} onClick={()=>markExpPaid(e.id)}>Cobrar</button>
                            }
                          </td>
                          <td style={{padding:".65rem .85rem"}}>
                            <div style={{display:"flex",gap:".3rem",flexWrap:"wrap"}}>
                              <button className="btn-sm-o" style={{fontSize:".62rem",padding:".22rem .6rem"}} onClick={()=>{setEditExpD({...e});setEditExpModal(true);}}>✏️ Editar</button>
                              <button className="btn-danger" style={{fontSize:".62rem",padding:".22rem .5rem"}} onClick={()=>{if(window.confirm('¿Eliminar este gasto?'))deleteExpense(e.id);}}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{borderTop:`2px solid ${C.gold}`}}>
                        <td colSpan={3} style={{padding:".7rem .85rem",fontFamily:"'Lato',sans-serif",fontSize:".78rem",color:C.taupe,fontWeight:600}}>TOTAL ({filtExp.length} gastos)</td>
                        <td style={{padding:".7rem .85rem",fontWeight:700,color:C.danger,fontSize:".95rem"}}>{fmtMoney(filtExp.reduce((s,e)=>s+e.amount,0))}</td>
                        <td colSpan={2} style={{padding:".7rem .85rem",fontSize:".75rem",color:C.taupe}}>
                          Pagado: <strong style={{color:C.success}}>{fmtMoney(filtExp.filter(e=>e.paid).reduce((s,e)=>s+e.amount,0))}</strong>
                          &nbsp;·&nbsp;Pendiente: <strong style={{color:C.warning}}>{fmtMoney(filtExp.filter(e=>!e.paid).reduce((s,e)=>s+e.amount,0))}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              <div className="card" style={{padding:"1.4rem"}}>
                <h3 style={{fontFamily:"'Lato',sans-serif",fontSize:".77rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm,marginBottom:"1.25rem"}}>Ingresos por Habitación</h3>
                {rooms.map((rm,ri)=>{
                  const rev=bookings.filter(b=>b.room===rm.id&&isRev(b)).reduce((s,b)=>s+b.total,0);
                  const maxRev=Math.max(...rooms.map(r=>bookings.filter(b=>b.room===r.id&&isRev(b)).reduce((s,b)=>s+b.total,0)),1);
                  return(
                    <div key={rm.id} style={{marginBottom:".9rem"}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontFamily:"'Lato',sans-serif",fontSize:".79rem",marginBottom:".22rem"}}>
                        <span style={{color:C.ebony}}>{rm.name}</span><span style={{color:C.warm,fontWeight:700}}>{fmtMoney(rev)}</span>
                      </div>
                      <div style={{background:C.parchment,height:8}}><div style={{background:ROOM_COLORS[ri%ROOM_COLORS.length],width:`${rev?(rev/maxRev)*100:0}%`,height:"100%"}}/></div>
                    </div>
                  );
                })}
                <div style={{borderTop:`1px solid ${C.parchment}`,paddingTop:"1rem",marginTop:".5rem",fontFamily:"'Lato',sans-serif",fontSize:".8rem",display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:C.taupe}}>Margen estimado</span>
                  <span style={{fontWeight:700,color:netRev>=0?C.olive:C.danger}}>{Math.round((netRev/Math.max(totalRev,1))*100)}%</span>
                </div>
              </div>
            </div>);
          })()}

          {/* ── REVIEWS ── */}
          {adminTab==="reviews"&&(<div>
            <div style={{marginBottom:"1.1rem"}}>
              <p style={{fontFamily:"'Lato',sans-serif",fontSize:".82rem",color:C.taupe,margin:0}}>{dbReviews.filter(r=>r.approved).length} publicada(s) · {dbReviews.length} reseña(s) real(es){dbReviews.length?` · Promedio ${(dbReviews.reduce((s,r)=>s+r.rating,0)/dbReviews.length).toFixed(1)} ⭐`:""}</p>
              <p style={{fontFamily:"'Lato',sans-serif",fontSize:".74rem",color:C.taupe,marginTop:".35rem"}}>Las reseñas reales llegan solas: tras cada estadía se pide una por correo. En el sitio se muestran testimonios de ejemplo por ahora; las reales los irán reemplazando poco a poco a medida que las publiques.</p>
            </div>
            {dbReviews.length===0
              ? <div className="card" style={{padding:"1.5rem",color:C.taupe,fontFamily:"'Lato',sans-serif",fontSize:".85rem"}}>Aún no hay reseñas reales. Se solicitan automáticamente por correo tras cada estadía y aparecerán aquí para que las apruebes.</div>
              : <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
                {dbReviews.map(r=>(
                  <div key={r.id} className="card" style={{padding:"1.4rem 1.7rem",borderLeft:`4px solid ${r.approved?C.gold:C.sand}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:".55rem",flexWrap:"wrap",gap:".5rem"}}>
                      <div style={{display:"flex",gap:".7rem",alignItems:"center",flexWrap:"wrap"}}>
                        <span style={{fontFamily:"'Lato',sans-serif",fontWeight:700,color:C.ebony}}>{r.name}</span>
                        <span style={{color:C.taupe,fontSize:".76rem",fontFamily:"'Lato',sans-serif"}}>{r.created_at?r.created_at.slice(0,10):""} · ✓ Estadía verificada</span>
                        <span style={{color:C.gold,letterSpacing:2,fontSize:".85rem"}}>{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</span>
                      </div>
                      <span style={{fontFamily:"'Lato',sans-serif",fontSize:".67rem",background:r.approved?C.successBg:C.dangerBg,color:r.approved?C.success:C.danger,padding:".14rem .65rem",borderRadius:20,fontWeight:700}}>{r.approved?"Publicada":"Pendiente"}</span>
                    </div>
                    <p style={{fontStyle:"italic",color:C.ebony,lineHeight:1.75,marginBottom:".9rem"}}>"{r.body}"</p>
                    <div style={{display:"flex",gap:".45rem",flexWrap:"wrap"}}>
                      <button className={r.approved?"btn-danger":"btn-success"} style={{fontSize:".63rem",padding:".25rem .65rem"}} onClick={async()=>{const {error}=await supabase.from('reviews').update({approved:!r.approved}).eq('id',r.id);if(error){showToast("❌ "+error.message);return;}fetchDbReviews();showToast(r.approved?"Ocultada":"Publicada ✓");}}>
                        {r.approved?"Ocultar":"Publicar"}
                      </button>
                      <button style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontFamily:"'Lato',sans-serif",fontSize:".7rem"}} onClick={async()=>{const {error}=await supabase.from('reviews').delete().eq('id',r.id);if(error){showToast("❌ "+error.message);return;}fetchDbReviews();showToast("Eliminada");}}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>}
          </div>)}

          {/* ── ANALYTICS ── */}
          {adminTab==="analytics"&&(<div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:"1rem",marginBottom:"1.75rem"}}>
              {[[fmtMoney(totalRev),"Ingresos",C.warm],[fmtMoney(netRevenue),"Ingreso Neto (post-comisión)",netRevenue>=0?C.olive:C.danger],[Math.round((occupiedToday/rooms.length)*100)+"%","Ocup. Hoy",C.olive],[fmtMoney(adr),"ADR · Tarifa Media",C.gold],[fmtMoney(revpar30),"RevPAR (30 días)",C.warm],[bookings.filter(b=>b.source==="Direct"&&isRev(b)).length,"Reservas Directas",C.mahogany],[fmtMoney(otaCommission),"Comisiones Airbnb/Booking",C.danger],[dbReviews.length+"",dbReviews.length?`Reseñas reales · ${(dbReviews.reduce((s,r)=>s+(Number(r.rating)||0),0)/dbReviews.length).toFixed(1)}⭐`:"Reseñas reales",C.gold]].map(([v,l,col])=>(
                <div key={l} className="stat" style={{borderTopColor:col}}><div className="stat-v" style={{color:col,fontSize:"1.55rem"}}>{v}</div><div className="stat-l">{l}</div></div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}} className="mob-full">
              <div className="card" style={{padding:"1.5rem"}}>
                <h3 style={{fontFamily:"'Lato',sans-serif",fontSize:".77rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm,marginBottom:"1.4rem"}}>Canales de Reserva</h3>
                {(()=>{
                  const rows = channelBreakdown(bookings);
                  const COL = {"Direct":C.warm,"Airbnb":"#FF5A5F","Booking.com":"#003580","WhatsApp":"#1B7F46","Teléfono":C.olive};
                  if(!rows.length) return <p style={{fontFamily:"'Lato',sans-serif",fontSize:".8rem",color:C.taupe}}>Aún no hay reservas con ingresos.</p>;
                  return rows.map(({source,count,revenue,pct})=>(
                    <div key={source} style={{marginBottom:"1.1rem"}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:".5rem",flexWrap:"wrap",fontFamily:"'Lato',sans-serif",fontSize:".8rem",marginBottom:".28rem"}}>
                        <span style={{color:C.ebony,fontWeight:600}}>{source==="Direct"?"Directa (web)":source}{isOta({source})?` · ${Math.round(OTA_RATE*1000)/10}% comisión`:""}</span>
                        <span style={{color:C.taupe}}>{count} reserva{count!==1?"s":""} · {pct}% · {fmtMoney(revenue)}</span>
                      </div>
                      <div style={{background:C.parchment,height:9}}><div style={{background:COL[source]||C.gold,width:`${pct}%`,height:"100%"}}/></div>
                    </div>
                  ));
                })()}
                <div style={{marginTop:"1.4rem",padding:".9rem 1.1rem",background:C.smoke,borderLeft:`3px solid ${C.gold}`}}>
                  <p style={{fontFamily:"'Lato',sans-serif",fontSize:".79rem",color:C.warm,lineHeight:1.65}}>Las reservas sin Airbnb/Booking (web, WhatsApp, teléfono) te ahorraron unos <strong>{fmtMoney(Math.round(bookings.filter(b=>isRev(b)&&!isOta(b)).reduce((s,b)=>s+(Number(b.total)||0)*OTA_RATE,0)))}</strong> en comisiones.</p>
                </div>
              </div>
              <div className="card" style={{padding:"1.5rem"}}>
                <h3 style={{fontFamily:"'Lato',sans-serif",fontSize:".77rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm,marginBottom:"1.4rem"}}>Ingresos por Habitación</h3>
                {rooms.map((rm,ri)=>{
                  const rev=bookings.filter(b=>b.room===rm.id&&isRev(b)).reduce((s,b)=>s+b.total,0);
                  const maxRev=Math.max(...rooms.map(r=>bookings.filter(b=>b.room===r.id&&isRev(b)).reduce((s,b)=>s+b.total,0)),1);
                  return(<div key={rm.id} style={{marginBottom:"1rem"}}><div style={{display:"flex",justifyContent:"space-between",fontFamily:"'Lato',sans-serif",fontSize:".79rem",marginBottom:".24rem"}}><span style={{color:C.ebony}}>{rm.name}</span><span style={{color:C.warm,fontWeight:700}}>{fmtMoney(rev)}</span></div><div style={{background:C.parchment,height:9}}><div style={{background:ROOM_COLORS[ri%ROOM_COLORS.length],width:`${rev?(rev/maxRev)*100:0}%`,height:"100%"}}/></div></div>);
                })}
              </div>
            </div>
          </div>)}

          {/* ── SETTINGS ── */}
          {adminTab==="settings"&&(<div style={{maxWidth:680}}>
            <div className="card" style={{padding:"1.75rem",marginBottom:"1.5rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.4rem"}}>
                <h3 style={{fontFamily:"'Lato',sans-serif",fontSize:".77rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm}}>Información del Negocio</h3>
                <button className="btn-sm" onClick={()=>{setSettDraft({...settings,whatsapp:formatWa(settings.whatsapp)});setSettErr("");setEditSettings(true);}}>✏️ Editar</button>
              </div>
              {[["Nombre",settings.propName],["Dirección",settings.address],["Teléfono",settings.phone],["WhatsApp",formatWa(settings.whatsapp)],["Email",settings.email],["Check-in",settings.checkIn],["Check-out",settings.checkOut],["Instagram",settings.instagram],["Noches mínimas",settings.minNights]].map(([l,v])=>(
                <div key={l} style={{display:"flex",gap:"1rem",padding:".65rem 0",borderBottom:`1px solid ${C.smoke}`,fontFamily:"'Lato',sans-serif"}}>
                  <span style={{fontSize:".63rem",color:C.taupe,letterSpacing:".1em",textTransform:"uppercase",minWidth:140}}>{l}</span>
                  <span style={{fontSize:".86rem",color:C.ebony,flex:1,whiteSpace:"pre-line"}}>{v}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{padding:"1.75rem"}}>
              <h3 style={{fontFamily:"'Lato',sans-serif",fontSize:".77rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm,marginBottom:"1rem"}}>Acciones</h3>
              <div style={{display:"flex",gap:".65rem",flexWrap:"wrap"}}>
                <button className="btn-sm-o" onClick={printReport}>🖨️ Imprimir Reporte</button>
                <button className="btn-sm-o" onClick={viewPublicSite}>🌐 Ver Sitio Público</button>
                <button className="btn-sm-o" onClick={adminLogout}>🚪 Cerrar Sesión</button>
              </div>
              <div style={{marginTop:"1.5rem",padding:"1rem 1.25rem",background:C.smoke,borderLeft:`3px solid ${C.gold}`}}>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".82rem",color:C.warm,fontWeight:700,marginBottom:".5rem"}}>🟢 Sistema conectado y en vivo</p>
                <div style={{fontFamily:"'Lato',sans-serif",fontSize:".79rem",color:C.taupe,lineHeight:2}}>
                  <div>✅ Base de datos: Supabase</div>
                  <div>✅ Correos automáticos: Resend</div>
                  <div>✅ Publicado en: Vercel</div>
                  <div style={{color:C.success||"#2E7D32"}}>✅ Dominio propio: caonabo35.com</div>
                </div>
              </div>

              {/* Security status */}
              <div style={{marginTop:"1.5rem",padding:"1rem 1.25rem",background:"#E8F5E9",borderLeft:"3px solid #2E7D32"}}>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".82rem",color:"#1B5E20",fontWeight:700,marginBottom:".5rem"}}>🔒 Estado de Seguridad</p>
                <div style={{fontFamily:"'Lato',sans-serif",fontSize:".79rem",color:"#2E7D32",lineHeight:2}}>
                  <div>✅ Sesiones: expire al cerrar el navegador</div>
                  <div>✅ Base de datos: acceso restringido por políticas RLS</div>
                  <div>✅ Reservas de huéspedes: solo pueden crear (no leer otras)</div>
                </div>
              </div>

              {/* Room availability toggles */}
              <div style={{marginTop:"2rem"}}>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".77rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm,marginBottom:"1rem"}}>🛏 Disponibilidad de Habitaciones</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:".65rem",marginBottom:".75rem"}}>
                  {rooms.map(r=>{
                    const avail=r.available!==false;
                    return(<div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:".75rem 1rem",background:C.smoke,border:`1px solid ${avail?C.gold+"40":C.danger+"60"}`}}>
                      <span style={{fontFamily:"'Lato',sans-serif",fontSize:".83rem",fontWeight:600}}>{r.name}</span>
                      <button onClick={()=>toggleRoomAvail(r.id)} style={{background:avail?C.gold:C.danger,color:avail?C.ebony:"#fff",border:"none",padding:".3rem .9rem",fontFamily:"'Lato',sans-serif",fontSize:".68rem",fontWeight:700,cursor:"pointer",letterSpacing:".08em"}}>{avail?"ACTIVA":"CERRADA"}</button>
                    </div>);
                  })}
                </div>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".74rem",color:C.taupe}}>Marca una habitación como CERRADA para mantenimiento o fuera de servicio. Los huéspedes no podrán reservarla.</p>
              </div>

              {/* ── Channel calendar sync (Airbnb / Booking.com iCal) ── */}
              <div style={{marginTop:"2rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:".5rem",marginBottom:".35rem"}}>
                  <p style={{fontFamily:"'Lato',sans-serif",fontSize:".77rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm,margin:0}}>🔗 Sincronizar Airbnb / Booking.com</p>
                  <button className="btn-sm" onClick={()=>syncChannels(false)} disabled={syncing}>{syncing?"Sincronizando…":"↻ Sincronizar ahora"}</button>
                </div>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".74rem",color:C.taupe,marginBottom:"1rem"}}>Pega el enlace iCal de cada anuncio (en Airbnb: Calendario → Disponibilidad → Conectar con otro sitio web → Exportar calendario). Las fechas reservadas en esos canales se bloquean aquí automáticamente para evitar reservas dobles.{channelBlocks.size>0?` (${channelBlocks.size} noches importadas)`:""}</p>
                {channelFeeds.length>0&&<div style={{display:"flex",flexDirection:"column",gap:".5rem",marginBottom:"1rem"}}>
                  {channelFeeds.map(f=>(
                    <div key={f.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:".5rem",padding:".65rem .85rem",background:C.smoke,border:`1px solid ${C.sand}`,borderRadius:4,fontFamily:"'Lato',sans-serif",fontSize:".8rem"}}>
                      <div style={{minWidth:0}}>
                        <div style={{fontWeight:700,color:C.ebony}}>{f.label} · {f.room_id?rooms.find(r=>String(r.id)===String(f.room_id))?.name||("Hab. "+f.room_id):"Todas las habitaciones"}</div>
                        <div style={{color:C.taupe,fontSize:".7rem",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.last_status||"sin sincronizar aún"}{f.last_synced?` · ${new Date(f.last_synced).toLocaleString('es-DO')}`:""}</div>
                      </div>
                      <button className="btn-danger" style={{padding:".2rem .6rem",fontSize:".65rem",flexShrink:0}} onClick={()=>deleteFeed(f)}>✕</button>
                    </div>
                  ))}
                </div>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".6rem"}}>
                  <div><FL>Canal</FL><select className="sel" value={feedForm.source} onChange={e=>setFeedForm(p=>({...p,source:e.target.value}))}><option value="airbnb">Airbnb</option><option value="booking">Booking.com</option><option value="other">Otro</option></select></div>
                  <div><FL>Habitación</FL><select className="sel" value={feedForm.room_id} onChange={e=>setFeedForm(p=>({...p,room_id:e.target.value}))}><option value="">Todas</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                  <div style={{gridColumn:"1/-1"}}><FL>Enlace iCal (.ics)</FL><Inp value={feedForm.ics_url} onChange={e=>setFeedForm(p=>({...p,ics_url:e.target.value}))} placeholder="https://www.airbnb.com/calendar/ical/....ics"/></div>
                </div>
                <button className="btn-gold" style={{marginTop:".7rem"}} onClick={addFeed}>+ Añadir calendario</button>
              </div>

              {/* ── Automated guest emails toggle ── */}
              <div style={{marginTop:"2rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:".6rem"}}>
                  <div style={{minWidth:0}}>
                    <p style={{fontFamily:"'Lato',sans-serif",fontSize:".77rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm,margin:0}}>✉️ Correos automáticos a huéspedes</p>
                    <p style={{fontFamily:"'Lato',sans-serif",fontSize:".74rem",color:C.taupe,marginTop:".3rem",maxWidth:540}}>Un correo antes de la llegada (dirección, check-in, WhatsApp) y otro tras la salida pidiendo una reseña. Cada huésped lo recibe una sola vez. Actívalo cuando estés listo.</p>
                  </div>
                  <button onClick={toggleGuestEmails} style={{flexShrink:0,background:emailsOn?"#2e7d32":C.sand,color:emailsOn?"#fff":C.ebony,border:"none",padding:".45rem 1.15rem",fontFamily:"'Lato',sans-serif",fontSize:".72rem",fontWeight:700,cursor:"pointer",borderRadius:6,letterSpacing:".06em"}}>{emailsOn?"● ACTIVADO":"○ DESACTIVADO"}</button>
                </div>
              </div>
            </div>
          </div>)}

          {/* ═══ PRECIOS — the single home for everything price-related ═══ */}
          {adminTab==="precios"&&(<div>
            <div className="card" style={{padding:"1.75rem",maxWidth:860}}>
              <h3 style={{fontFamily:"'Lato',sans-serif",fontSize:".8rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm,marginBottom:".3rem"}}>💲 Precios — todo en un solo lugar</h3>
              <p style={{fontFamily:"'Lato',sans-serif",fontSize:".78rem",color:C.taupe,marginTop:0,marginBottom:"1.6rem"}}>Precio base, descuentos y tarifas temporales. Todo lo relacionado con precios vive aquí — no hay que buscar en otras pestañas.</p>

              {/* ── Room Pricing ── */}
              <div style={{marginTop:"2rem"}}>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".77rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm,marginBottom:"1rem"}}>💲 Precios por Habitación</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:".65rem",marginBottom:".75rem"}}>
                  {rooms.map(r=>(
                    <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:".75rem 1rem",background:C.smoke,border:"1px solid "+C.sand}}>
                      <span style={{fontFamily:"'Lato',sans-serif",fontSize:".83rem",fontWeight:600}}>{r.name}</span>
                      <div style={{display:"flex",alignItems:"center",gap:".4rem"}}>
                        <span style={{fontFamily:"'Lato',sans-serif",fontSize:".75rem",color:C.taupe}}>$</span>
                        <input
                          type="number"
                          value={priceEdits[r.id] !== undefined ? priceEdits[r.id] : r.price}
                          onChange={e=>setPriceEdits(prev=>({...prev,[r.id]:e.target.value}))}
                          style={{width:60,border:"1px solid "+C.sand,background:"#fff",padding:".25rem .4rem",fontFamily:"'Lato',sans-serif",fontSize:".83rem",textAlign:"right"}}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={saveRoomPrices} style={{background:C.gold,color:C.ebony,border:"none",padding:".45rem 1.2rem",fontFamily:"'Lato',sans-serif",fontSize:".73rem",fontWeight:700,cursor:"pointer",letterSpacing:".08em"}}>GUARDAR PRECIOS</button>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".74rem",color:C.taupe,marginTop:".5rem"}}>Los precios base están en USD por noche. Los cambios aplican a nuevas reservas.</p>
              </div>

              {/* ── Seasonal Pricing ── */}
              <div style={{marginTop:"2rem"}}>
                <div className="card" style={{marginBottom:"1.5rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".4rem",flexWrap:"wrap",gap:".5rem"}}>
                    <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.1rem",fontWeight:600,color:C.ebony,margin:0}}>🌡️ Precios Estacionales</h3>
                    <div style={{display:"flex",gap:".4rem",flexWrap:"wrap"}}>
                      <button className="btn-sm" onClick={()=>{setEditRange(v=>!v);setEditSeasons(false);}}>{editRange?"Cerrar":"📅 Tarifa temporal"}</button>
                      <button className="btn-sm-o" onClick={()=>{setEditSeasons(v=>!v);setEditRange(false);}}>{editSeasons?"Cerrar":"🔁 Temporada anual"}</button>
                    </div>
                  </div>
                  <p style={{fontFamily:"'Lato',sans-serif",fontSize:".72rem",color:C.taupe,marginTop:0,marginBottom:"1rem"}}>Tarifa temporal = un precio para fechas específicas que vuelve al precio normal cuando pasan. Temporada anual = un aumento % que se repite cada año.</p>
                  {seasons.length===0&&<p style={{fontFamily:"'Lato',sans-serif",fontSize:".82rem",color:C.taupe}}>Sin precios especiales. Los precios base aplican todo el año.</p>}
                  {seasons.map((s,i)=>{
                    const del=async()=>{const ns=seasons.filter((_,j)=>j!==i);const{error}=await supabase.from('settings').update({seasons_json:JSON.stringify(ns)}).eq('id',1);if(error){showToast("❌ Error: "+error.message);return;}setSeasons(ns);showToast("Eliminada ✓");};
                    if(s.type==='range'){
                      const roomName = (!s.room||s.room==='all') ? "Todas" : (rooms.find(r=>String(r.id)===String(s.room))?.name||("Hab. "+s.room));
                      const st = TODAY>s.end ? {t:"expirada",c:C.taupe} : TODAY<s.start ? {t:"próxima",c:"#1565C0"} : {t:"activa",c:"#2e7d32"};
                      return(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:".5rem",padding:".6rem .8rem",background:C.smoke,borderRadius:4,marginBottom:".5rem",fontFamily:"'Lato',sans-serif",fontSize:".8rem",opacity:st.t==="expirada"?.55:1}}>
                          <span>📅 {s.name?<strong>{s.name} · </strong>:null}{roomName} · {s.start} → {s.end} · <span style={{color:C.gold,fontWeight:700}}>{s.mode==='pct'?`+${s.pct}%`:`$${s.price}/noche`}</span> · <span style={{color:st.c,fontWeight:700,textTransform:"uppercase",fontSize:".62rem"}}>{st.t}</span></span>
                          <button className="btn-danger" style={{padding:".2rem .6rem",fontSize:".65rem",flexShrink:0}} onClick={del}>✕</button>
                        </div>
                      );
                    }
                    return(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:".5rem",padding:".6rem .8rem",background:C.smoke,borderRadius:4,marginBottom:".5rem",fontFamily:"'Lato',sans-serif",fontSize:".8rem"}}>
                        <span>🔁 <strong>{s.name}</strong> · {s.startMonth}/{s.startDay} – {s.endMonth}/{s.endDay} · <span style={{color:C.gold,fontWeight:700}}>+{s.pct}%</span> <span style={{color:C.taupe,fontSize:".64rem"}}>(cada año)</span></span>
                        <button className="btn-danger" style={{padding:".2rem .6rem",fontSize:".65rem",flexShrink:0}} onClick={del}>✕</button>
                      </div>
                    );
                  })}
                  {editRange&&(
                    <div style={{borderTop:`1px solid ${C.sand}`,paddingTop:"1rem",marginTop:".5rem"}}>
                      <div style={{fontFamily:"'Lato',sans-serif",fontSize:".72rem",color:C.warm,fontWeight:700,marginBottom:".7rem"}}>📅 Precio temporal para fechas específicas (vuelve al normal después)</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:".75rem"}}>
                        <div><FL>Habitación</FL><select className="sel" value={newRange.room} onChange={e=>setNewRange(p=>({...p,room:e.target.value}))}><option value="all">Todas</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                        <div><FL>Precio / noche ($)</FL><Inp type="number" value={newRange.price} onChange={e=>setNewRange(p=>({...p,price:e.target.value}))}/></div>
                        <div><FL>Desde</FL><Inp type="date" value={newRange.start} onChange={e=>setNewRange(p=>({...p,start:e.target.value}))}/></div>
                        <div><FL>Hasta</FL><Inp type="date" value={newRange.end} onChange={e=>setNewRange(p=>({...p,end:e.target.value}))}/></div>
                        <div style={{gridColumn:"1/-1"}}><FL>Nombre (opcional, ej: Navidad)</FL><Inp value={newRange.name} onChange={e=>setNewRange(p=>({...p,name:e.target.value}))}/></div>
                      </div>
                      <button className="btn-gold" style={{width:"100%"}} onClick={async()=>{
                        if(!newRange.start||!newRange.end||!newRange.price){showToast("Elige fechas y precio");return;}
                        if(newRange.end<newRange.start){showToast("La fecha 'Hasta' debe ser igual o posterior a 'Desde'");return;}
                        const rule={type:'range',mode:'price',name:newRange.name,room:newRange.room,start:newRange.start,end:newRange.end,price:Number(newRange.price)};
                        const ns=[...seasons,rule];
                        const{error}=await supabase.from('settings').update({seasons_json:JSON.stringify(ns)}).eq('id',1);
                        if(error){showToast("❌ Error al guardar: "+error.message);return;}
                        setSeasons(ns);
                        setNewRange({name:'',room:'all',start:'',end:'',price:''});
                        setEditRange(false);
                        showToast("Tarifa temporal guardada ✓");
                      }}>GUARDAR TARIFA TEMPORAL</button>
                    </div>
                  )}
                  {editSeasons&&(
                    <div style={{borderTop:`1px solid ${C.sand}`,paddingTop:"1rem",marginTop:".5rem"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:".75rem"}}>
                        <div style={{gridColumn:"1/-1"}}><FL>Nombre (ej: Temporada Alta, Navidad)</FL><Inp value={newSeason.name} onChange={e=>setNewSeason(p=>({...p,name:e.target.value}))}/></div>
                        <div><FL>Mes inicio (01-12)</FL><Inp type="number" min="1" max="12" value={newSeason.startMonth} onChange={e=>setNewSeason(p=>({...p,startMonth:e.target.value.padStart(2,'0')}))}/></div>
                        <div><FL>Día inicio</FL><Inp type="number" min="1" max="31" value={newSeason.startDay} onChange={e=>setNewSeason(p=>({...p,startDay:e.target.value.padStart(2,'0')}))}/></div>
                        <div><FL>Mes fin (01-12)</FL><Inp type="number" min="1" max="12" value={newSeason.endMonth} onChange={e=>setNewSeason(p=>({...p,endMonth:e.target.value.padStart(2,'0')}))}/></div>
                        <div><FL>Día fin</FL><Inp type="number" min="1" max="31" value={newSeason.endDay} onChange={e=>setNewSeason(p=>({...p,endDay:e.target.value.padStart(2,'0')}))}/></div>
                        <div style={{gridColumn:"1/-1"}}><FL>Incremento de precio (%)</FL><Inp type="number" min="1" max="100" value={newSeason.pct} onChange={e=>setNewSeason(p=>({...p,pct:parseInt(e.target.value)||0}))}/></div>
                      </div>
                      <button className="btn-gold" style={{width:"100%"}} onClick={async()=>{
                        if(!newSeason.name||!newSeason.pct){showToast("Completa todos los campos");return;}
                        const ns=[...seasons,{...newSeason}];
                        const{error}=await supabase.from('settings').update({seasons_json:JSON.stringify(ns)}).eq('id',1);
                        if(error){showToast("❌ Error al guardar temporada: "+error.message);return;}
                        setSeasons(ns);
                        setNewSeason({name:'',startMonth:'12',startDay:'15',endMonth:'01',endDay:'05',pct:20});
                        setEditSeasons(false);
                        showToast("Temporada guardada ✓");
                      }}>GUARDAR TEMPORADA</button>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Export Calendar ── */}
              <div style={{marginTop:"1rem",marginBottom:"1.5rem"}}>
                <button type="button" className="btn-sm-o" style={{marginBottom:".75rem"}} onClick={()=>exportIcal(null)}>📅 Exportar Calendario (.ics)</button>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".74rem",color:C.taupe,margin:"0 0 .5rem"}}>Por habitación (para que cada anuncio de Airbnb reciba solo su habitación):</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:".4rem"}}>
                  {rooms.map(r=><button key={r.id} type="button" className="btn-sm-o" style={{minHeight:40}} onClick={()=>exportIcal(r)}>{r.name}</button>)}
                </div>
              </div>

              {/* ── Per-Room Discounts ── */}
              <div style={{marginTop:"2rem"}}>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".77rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm,marginBottom:".4rem"}}>🏷️ Descuentos por Habitación</p>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".74rem",color:C.taupe,marginBottom:"1rem"}}>El precio original aparecerá tachado. Pon 0 para quitar el descuento.</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:".65rem",marginBottom:".75rem"}}>
                  {rooms.map(r=>(
                    <div key={r.id} style={{padding:".75rem 1rem",background:C.smoke,border:"1px solid "+(r.discount>0?C.gold+"60":C.sand)}}>
                      <div style={{fontFamily:"'Lato',sans-serif",fontSize:".83rem",fontWeight:600,marginBottom:".5rem"}}>{r.name}</div>
                      <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
                        <span style={{fontFamily:"'Lato',sans-serif",fontSize:".75rem",color:C.taupe}}>Descuento:</span>
                        <input type="number" min="0" max="99"
                          value={editRoomPrices["d_"+r.id]!==undefined?editRoomPrices["d_"+r.id]:r.discount}
                          onChange={e=>setEditRoomPrices(prev=>({...prev,["d_"+r.id]:e.target.value}))}
                          style={{width:50,border:"1px solid "+C.sand,background:"#fff",padding:".25rem .4rem",fontFamily:"'Lato',sans-serif",fontSize:".83rem",textAlign:"right"}}
                        />
                        <span style={{fontFamily:"'Lato',sans-serif",fontSize:".75rem",color:C.taupe}}>%</span>
                      </div>
                      {r.discount>0&&<div style={{fontFamily:"'Lato',sans-serif",fontSize:".72rem",color:C.gold,marginTop:".3rem"}}>{"Activo: -"+r.discount+"% → $"+Math.round(r.price*(1-r.discount/100))+"/noche"}</div>}
                    </div>
                  ))}
                </div>
                <button onClick={saveRoomDiscounts} style={{background:C.gold,color:C.ebony,border:"none",padding:".45rem 1.2rem",fontFamily:"'Lato',sans-serif",fontSize:".73rem",fontWeight:700,cursor:"pointer",letterSpacing:".08em"}}>GUARDAR DESCUENTOS</button>
              </div>
            </div>

            {/* The per-night price calendar lives on the Calendario tab (it's a calendar) */}
            <div style={{marginTop:"1.5rem",padding:"1rem 1.25rem",background:C.smoke,borderLeft:`3px solid ${C.gold}`,maxWidth:860}}>
              <p style={{fontFamily:"'Lato',sans-serif",fontSize:".8rem",color:C.warm,margin:0,lineHeight:1.6}}>📆 El <strong>calendario de precios por noche</strong> está en la pestaña <strong>📅 Calendario</strong> → botón <strong>"💲 Precios por noche"</strong>.</p>
            </div>
          </div>)}

          </div>
        </div>


        {/* ═══ ADMIN MODALS ═══ */}

        {/* Detail / Edit Booking */}
        {(editBooking||detailB)&&(<Backdrop onClose={()=>{setEditBooking(null);setDetailB(null);setEditBError("");}}>
          <ModalBox>
            <ModalHdr title={editBooking?editBooking.guest:detailB?.guest} sub={editBooking?"EDITAR RESERVA":"DETALLE DE RESERVA"} onClose={()=>{setEditBooking(null);setDetailB(null);setEditBError("");}}/>
            <div style={{padding:"1.5rem 2rem"}}>
              {editBooking?(<>
                {editBError&&<div className="error-banner" role="alert">{editBError}</div>}
                {bookingFields(editBooking,setEditBooking,"eb",STATUS_OPTIONS)}
                {totalBox(bookings.find(x=>x.id===editBooking.id),editBooking,setEditBooking,"eb")}
                <label style={{display:"flex",alignItems:"center",gap:".5rem",fontFamily:"'Lato',sans-serif",fontSize:".83rem",cursor:"pointer",marginBottom:"1.4rem",minHeight:44}}><input type="checkbox" checked={!!editBooking.paid} onChange={e=>setEditBooking({...editBooking,paid:e.target.checked})} style={{width:20,height:20}}/> Pagado</label>
                <div style={{display:"flex",gap:".65rem",flexWrap:"wrap"}}>
                  <button className="btn-gold" style={{flex:"1 1 200px"}} disabled={saving} onClick={()=>saveBooking(editBooking)}>{saving?"GUARDANDO…":"GUARDAR CAMBIOS"}</button>
                  <button type="button" className="btn-out lt" style={{padding:".75rem 1.1rem",color:C.danger,borderColor:C.danger}} onClick={()=>setBookingAction(bookings.find(x=>x.id===editBooking.id)||editBooking)}>Cancelar o eliminar…</button>
                </div>
              </>):(
                <div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",fontFamily:"'Lato',sans-serif",marginBottom:"1.25rem"}}>
                    {[["Email",detailB?.email],["Teléfono",detailB?.phone],["Habitación",rooms.find(r=>r.id===detailB?.room)?.name],["Check-in",detailB?.checkIn],["Check-out",detailB?.checkOut],["Noches",detailB?.checkIn&&detailB?.checkOut?nights(detailB.checkIn,detailB.checkOut):"-"],["Huéspedes",detailB?.guests],["Fuente",detailB?.source],["Total",fmtMoney(detailB?.total||0)],["Pago",detailB?.paid?"✓ Pagado":"Pendiente"]].map(([l,v])=>(
                      <div key={l}><div style={{fontSize:".62rem",color:C.taupe,textTransform:"uppercase",letterSpacing:".12em",marginBottom:".2rem"}}>{l}</div><div style={{fontWeight:700,color:C.ebony,fontSize:".87rem"}}>{v}</div></div>
                    ))}
                  </div>
                  {detailB?.idNumber&&<div style={{padding:".85rem 1rem",background:"#FFF8E1",borderLeft:`3px solid ${C.gold}`,marginBottom:"1rem",fontFamily:"'Lato',sans-serif"}}><div style={{fontSize:".62rem",color:C.taupe,textTransform:"uppercase",letterSpacing:".12em",marginBottom:".3rem"}}>Identificación</div><div style={{fontWeight:700,color:C.ebony,fontSize:".9rem"}}>{detailB.idType==='cedula'?'🪪 Cédula':'🛂 Pasaporte'}: {detailB.idNumber}</div></div>}
                  {detailB?.idPhotoUrl&&<div style={{padding:".85rem 1rem",background:"#FFF8E1",borderLeft:`3px solid ${C.gold}`,marginBottom:"1rem",fontFamily:"'Lato',sans-serif"}}><div style={{fontSize:".62rem",color:C.taupe,textTransform:"uppercase",letterSpacing:".12em",marginBottom:".5rem"}}>Foto de ID</div>{isSafeImageDataUrl(detailB.idPhotoUrl)?(<><img src={detailB.idPhotoUrl} alt="Foto de identificación" style={{maxWidth:"100%",maxHeight:200,borderRadius:6,display:"block",border:`1px solid ${C.sand}`,cursor:"pointer"}} onClick={()=>openImageWindow(detailB.idPhotoUrl,"Foto de ID")}/><button onClick={()=>openImageWindow(detailB.idPhotoUrl,"Foto de ID")} style={{background:"none",border:"none",fontSize:".72rem",color:C.gold,marginTop:".4rem",display:"inline-block",cursor:"pointer",padding:0,fontFamily:"'Lato',sans-serif"}}>Ver foto completa ↗</button></>):(<div style={{fontSize:".8rem",color:C.danger}}>Formato de foto no válido</div>)}</div>}
                  {detailB?.notes&&<div style={{padding:".85rem 1rem",background:C.smoke,borderLeft:`3px solid ${C.gold}`,marginBottom:"1.25rem"}}><p style={{fontStyle:"italic",color:C.ebony,fontFamily:"'Lato',sans-serif",fontSize:".86rem"}}>{detailB.notes}</p></div>}
                  {detailB?.status==="finalizada"&&<div className="success-banner" style={{marginBottom:"1rem",fontWeight:700,fontSize:".88rem"}}>✓ Estancia completada — Check-out realizado</div>}
                  <div style={{display:"flex",gap:".65rem",flexWrap:"wrap"}}>
                    <button className="btn-gold" onClick={()=>{setEditBooking({...detailB});setDetailB(null);setEditBError("");}}>✏️ Editar</button>
                    {detailB?.status==="pending"&&<><button className="btn-success" style={{padding:".72rem 1.3rem"}} onClick={()=>{updateBookingStatus(detailB.id,"confirmed");setDetailB(null);}}>✓ Confirmar</button><button className="btn-danger" style={{padding:".72rem 1.3rem"}} onClick={()=>{updateBookingStatus(detailB.id,"cancelled");setDetailB(null);}}>✗ Cancelar</button></>}
                    {detailB?.status==="confirmed"&&<button style={{padding:".72rem 1.3rem",background:"#1565C0",color:"#fff",border:"none",borderRadius:4,fontFamily:"'Lato',sans-serif",fontWeight:700,fontSize:".78rem",cursor:"pointer",letterSpacing:".08em"}} onClick={()=>checkInGuest(detailB.id)}>🏨 Check In</button>}
                    {detailB?.status==="checked_in"&&<button style={{padding:".72rem 1.3rem",background:"#6A1B9A",color:"#fff",border:"none",borderRadius:4,fontFamily:"'Lato',sans-serif",fontWeight:700,fontSize:".78rem",cursor:"pointer",letterSpacing:".08em"}} onClick={()=>checkOutGuest(detailB.id)}>🚪 Check Out</button>}
                    {!detailB?.paid&&(detailB?.status==="confirmed"||detailB?.status==="checked_in")&&<button className="btn-success" style={{padding:".72rem 1.3rem"}} onClick={()=>{markPaid(detailB.id);setDetailB({...detailB,paid:true});}}>$ Pagado</button>}
                    {waLinkFor(detailB?.phone)&&<a href={waLinkFor(detailB?.phone)} target="_blank" rel="noopener noreferrer" className="btn-out" style={{padding:".65rem 1.2rem",fontSize:".7rem"}}>WhatsApp</a>}
                  </div>
                </div>
              )}
            </div>
          </ModalBox>
        </Backdrop>)}

        {/* New Booking Modal */}
        {newBookModal&&(<Backdrop onClose={()=>{setNewBookModal(false);setNewBError("");}}>
          <ModalBox>
            <ModalHdr title="Nueva Reserva Manual" sub="CREAR RESERVA" onClose={()=>{setNewBookModal(false);setNewBError("");}}/>
            <div style={{padding:"1.5rem 2rem"}}>
              {newBError&&<div className="error-banner" role="alert">{newBError}</div>}
              {bookingFields(newB,setNewB,"nb",STATUS_OPTIONS.filter(([v])=>v!=="cancelled"))}
              {totalBox(null,newB,setNewB,"nb")}
              <label style={{display:"flex",alignItems:"center",gap:".5rem",fontFamily:"'Lato',sans-serif",fontSize:".83rem",cursor:"pointer",marginBottom:"1rem",minHeight:44}}><input type="checkbox" checked={!!newB.paid} onChange={e=>setNewB({...newB,paid:e.target.checked})} style={{width:20,height:20}}/> Pagado</label>
              <button className="btn-gold" style={{width:"100%",marginTop:".5rem"}} disabled={saving} onClick={addBookingAdmin}>{saving?"GUARDANDO…":"CREAR RESERVA"}</button>
            </div>
          </ModalBox>
        </Backdrop>)}

        {/* Cancel (default) or permanently delete — never one tap */}
        {bookingAction&&(()=>{
          const bk = bookingAction;
          const n = isYmd(bk.checkIn)&&isYmd(bk.checkOut) ? nightsBetween(bk.checkIn,bk.checkOut) : 0;
          const rn = rooms.find(r=>String(r.id)===String(bk.room))?.name || ("Hab. "+bk.room);
          return(
          <Backdrop onClose={()=>setBookingAction(null)}>
            <ModalBox width={480}>
              <ModalHdr title="¿Cancelar o eliminar?" sub="CANCEL OR DELETE BOOKING" onClose={()=>setBookingAction(null)} closeLabel="Volver"/>
              <div style={{padding:"1.4rem 2rem 1.6rem",fontFamily:"'Lato',sans-serif"}} className="modal-pad">
                <div style={{background:C.smoke,borderLeft:`3px solid ${C.gold}`,padding:".8rem 1rem",marginBottom:"1.1rem",fontSize:".86rem",color:C.ebony,lineHeight:1.6}}>
                  <strong>{bk.guest}</strong> · {rn}<br/>{bk.checkIn} → {bk.checkOut} · {n} noche{n!==1?"s":""} · {fmtMoney(bk.total||0)}
                </div>
                {bk.status!=="cancelled"&&<>
                  <button type="button" data-autofocus className="btn-gold" style={{width:"100%",flexDirection:"column",gap:".2rem",padding:".85rem 1rem"}} onClick={()=>cancelBooking(bk.id)}>
                    <span>Cancelar reserva (recomendado)</span>
                    <span style={{fontWeight:400,letterSpacing:".02em",textTransform:"none",fontSize:".72rem"}}>Cancel booking — se guarda en el historial y libera las fechas</span>
                  </button>
                  <div style={{height:".7rem"}}/>
                </>}
                <button type="button" className="btn-danger" style={{width:"100%",padding:".8rem 1rem",fontSize:".74rem"}}
                  onClick={()=>{ if(window.confirm(`¿Eliminar PARA SIEMPRE la reserva de ${bk.guest} (${bk.checkIn} → ${bk.checkOut})? No se puede deshacer.\n\nDelete ${bk.guest}'s booking (${bk.checkIn} → ${bk.checkOut}) permanently? This cannot be undone.`)) deleteBooking(bk.id); }}>
                  🗑 Eliminar para siempre · Delete permanently
                </button>
                <button type="button" className="btn-out lt" style={{width:"100%",marginTop:".7rem"}} onClick={()=>setBookingAction(null)}>Volver · Go back</button>
              </div>
            </ModalBox>
          </Backdrop>);
        })()}

        {/* Edit Room */}
        {editRoom&&editRoomD&&(<Backdrop onClose={()=>{setEditRoom(null);setEditRoomD(null);}}>
          <ModalBox>
            <ModalHdr title={editRoom.name} sub="EDITAR HABITACIÓN" onClose={()=>{setEditRoom(null);setEditRoomD(null);}}/>
            <div style={{padding:"1.5rem 2rem"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                <div><FL>Nombre (ES)</FL><Inp value={editRoomD.name} onChange={e=>setEditRoomD({...editRoomD,name:e.target.value})}/></div>
                <div><FL>Nombre (EN)</FL><Inp value={editRoomD.nameEn} onChange={e=>setEditRoomD({...editRoomD,nameEn:e.target.value})}/></div>
                <div><FL>Precio / Noche</FL><div style={{fontSize:".76rem",color:C.taupe,padding:".55rem 0",fontFamily:"'Lato',sans-serif"}}>Se edita en la pestaña <strong style={{color:C.warm}}>💲 Precios</strong></div></div>
                <div><FL>Camas</FL><Inp value={editRoomD.beds} onChange={e=>setEditRoomD({...editRoomD,beds:e.target.value})}/></div>
                <div><FL>Tamaño</FL><Inp value={editRoomD.size} onChange={e=>setEditRoomD({...editRoomD,size:e.target.value})}/></div>
                <div><FL>Máx. Huéspedes</FL><Inp type="number" value={editRoomD.guests} onChange={e=>setEditRoomD({...editRoomD,guests:parseInt(e.target.value)||1})}/></div>
              </div>
              <div style={{marginBottom:"1rem"}}><FL>Amenidades (separadas por coma)</FL><Inp value={editRoomD.amenities.join(", ")} onChange={e=>setEditRoomD({...editRoomD,amenities:e.target.value.split(",").map(a=>a.trim()).filter(Boolean)})}/></div>
              <div style={{marginBottom:"1.4rem"}}><FL>Descripción</FL><textarea value={editRoomD.desc||""} onChange={e=>setEditRoomD({...editRoomD,desc:e.target.value})} style={{width:"100%",padding:".7rem",border:`1px solid ${C.sand}`,fontFamily:"'Lato',sans-serif",fontSize:".88rem",background:C.smoke,height:70,resize:"vertical",outline:"none",color:C.ebony}}/></div>
              <div style={{marginBottom:"1.4rem"}}>
                <FL>Disponibilidad</FL>
                <div style={{display:"flex",gap:"1.5rem",marginTop:".4rem"}}>
                  {[[true,"Disponible para reservas"],[false,"Bloqueada / En mantenimiento"]].map(([v,l])=>(
                    <label key={String(v)} style={{display:"flex",alignItems:"center",gap:".45rem",fontFamily:"'Lato',sans-serif",fontSize:".83rem",cursor:"pointer"}}>
                      <input type="radio" name="avail" checked={editRoomD.available===v} onChange={()=>setEditRoomD({...editRoomD,available:v})}/>{l}
                    </label>
                  ))}
                </div>
              </div>
              {/* ── Photos ──────────────────────────────────────────────── */}
              <div style={{marginBottom:"1.4rem",borderTop:`1px solid ${C.sand}`,paddingTop:"1.2rem"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".55rem",flexWrap:"wrap",gap:".5rem"}}>
                  <FL>Fotos de la habitación</FL>
                  <label className="btn-sm" style={{cursor:photoBusy?"wait":"pointer",opacity:photoBusy?0.6:1,margin:0}}>
                    {photoBusy?"Subiendo…":"+ Añadir fotos"}
                    <input type="file" accept="image/*" multiple disabled={photoBusy}
                      style={{display:"none"}}
                      onChange={e=>{ uploadRoomPhotos(editRoomD.id, e.target.files); e.target.value=""; }}/>
                  </label>
                </div>
                {!Array.isArray(editRoomD.photos)&&(
                  <div style={{fontFamily:"'Lato',sans-serif",fontSize:".74rem",color:C.taupe,background:C.smoke,padding:".6rem .8rem",borderLeft:`3px solid ${C.gold}`,marginBottom:".7rem",lineHeight:1.5}}>
                    Esta habitación usa las 2 fotos originales de la app. Al subir la primera foto
                    empiezas una galería nueva y puedes añadir todas las que quieras.
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:".6rem"}}>
                  {roomPhotos(editRoomD).map((p,i)=>{
                    const editable = Array.isArray(editRoomD.photos) && editRoomD.photos.length>0;
                    return (
                      <div key={p.url+i} style={{border:`1px solid ${i===0?C.gold:C.sand}`,background:C.smoke}}>
                        <div style={{position:"relative",height:86,overflow:"hidden"}}>
                          <img src={p.url} alt={p.label} loading="lazy"
                            style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                          {i===0&&<div style={{position:"absolute",top:0,left:0,background:C.gold,color:C.ebony,fontFamily:"'Lato',sans-serif",fontSize:".55rem",fontWeight:700,letterSpacing:".08em",padding:".12rem .4rem"}}>PORTADA</div>}
                        </div>
                        {editable&&(
                          <div style={{display:"flex",gap:2,padding:3}}>
                            <button title="Mover izquierda" disabled={photoBusy||i===0} onClick={()=>moveRoomPhoto(editRoomD.id,i,-1)} style={photoBtn(photoBusy||i===0)}>←</button>
                            <button title="Mover derecha" disabled={photoBusy||i===roomPhotos(editRoomD).length-1} onClick={()=>moveRoomPhoto(editRoomD.id,i,1)} style={photoBtn(photoBusy||i===roomPhotos(editRoomD).length-1)}>→</button>
                            <button title="Usar como portada" disabled={photoBusy||i===0} onClick={()=>makeRoomCover(editRoomD.id,i)} style={photoBtn(photoBusy||i===0)}>★</button>
                            <button title="Eliminar foto" disabled={photoBusy}
                              onClick={()=>{ if(window.confirm("¿Eliminar esta foto? No se puede deshacer.")) deleteRoomPhoto(editRoomD.id,i); }}
                              style={{...photoBtn(photoBusy),color:"#C62828"}}>✕</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{fontFamily:"'Lato',sans-serif",fontSize:".7rem",color:C.taupe,marginTop:".55rem"}}>
                  La primera foto es la que se ve en la web. ★ la pone de portada, ← → cambian el orden.
                  Los cambios de fotos se guardan al instante.
                </div>
              </div>
              <button className="btn-gold" style={{width:"100%"}} onClick={saveRoom}>GUARDAR CAMBIOS</button>
            </div>
          </ModalBox>
        </Backdrop>)}

        {/* Reply Modal */}
        {replyModal&&(<Backdrop onClose={()=>setReplyModal(null)}>
          <ModalBox width={500}>
            <ModalHdr title={`Responder a ${replyModal.guest}`} onClose={()=>setReplyModal(null)}/>
            <div style={{padding:"1.5rem 2rem"}}>
              <div style={{background:C.smoke,padding:".9rem 1.1rem",marginBottom:"1.25rem",borderLeft:`3px solid ${C.gold}`,fontStyle:"italic",color:C.ebony,fontFamily:"'Lato',sans-serif",lineHeight:1.7,fontSize:".88rem"}}>"{replyModal.message}"</div>
              <FL>Tu respuesta</FL>
              <textarea value={replyTxt} onChange={e=>setReplyTxt(e.target.value)} style={{width:"100%",padding:".75rem",border:`1px solid ${C.sand}`,fontFamily:"'Lato',sans-serif",fontSize:".88rem",height:110,resize:"vertical",outline:"none",marginBottom:"1.25rem",color:C.ebony}} placeholder="Escribe tu respuesta..."/>
              <div style={{display:"flex",gap:".65rem",flexWrap:"wrap"}}>
                {waLinkFor(replyModal.phone)&&<a href={waLinkFor(replyModal.phone,replyTxt)} target="_blank" rel="noopener noreferrer" className="btn-gold" style={{flex:1}}>📱 Enviar por WhatsApp</a>}
                {replyModal.email&&<a href={`mailto:${replyModal.email}?subject=${encodeURIComponent("Caonabo 35")}&body=${encodeURIComponent(replyTxt)}`} className="btn-out">📧 Email</a>}
                {!waLinkFor(replyModal.phone)&&!replyModal.email&&<p style={{fontFamily:"'Lato',sans-serif",fontSize:".8rem",color:C.taupe}}>Este mensaje no tiene teléfono ni email para responder.</p>}
              </div>
            </div>
          </ModalBox>
        </Backdrop>)}

        {/* Add Expense */}
        {addExpModal&&(<Backdrop onClose={()=>setAddExpModal(false)}>
          <ModalBox width={440}>
            <ModalHdr title="Nuevo Gasto" sub="REGISTRAR GASTO" onClose={()=>setAddExpModal(false)}/>
            <div style={{padding:"1.5rem 2rem"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:".85rem"}}>
                <div><FL>Fecha *</FL><Inp type="date" value={newExp.date} onChange={e=>setNewExp({...newExp,date:e.target.value})}/></div>
                <div><FL>Monto ($) *</FL><Inp type="number" min="0" step="0.01" placeholder="0.00" value={newExp.amount} onChange={e=>setNewExp({...newExp,amount:e.target.value})}/></div>
              </div>
              <div style={{marginBottom:".85rem"}}><FL>Categoría</FL><Sel value={newExp.category} onChange={e=>setNewExp({...newExp,category:e.target.value})}>{["Limpieza","Mantenimiento","Suministros","Servicios","Comisiones","Marketing","Otros"].map(c=><option key={c}>{c}</option>)}</Sel></div>
              <div style={{marginBottom:".85rem"}}><FL>Descripción *</FL><Inp placeholder="Ej: Servicio semanal de limpieza" value={newExp.desc} onChange={e=>setNewExp({...newExp,desc:e.target.value})}/></div>
              <label style={{display:"flex",alignItems:"center",gap:".5rem",fontFamily:"'Lato',sans-serif",fontSize:".85rem",cursor:"pointer",marginBottom:"1.4rem"}}><input type="checkbox" checked={newExp.paid} onChange={e=>setNewExp({...newExp,paid:e.target.checked})}/> Ya fue pagado</label>
              <button className="btn-gold" style={{width:"100%",fontSize:".82rem"}} onClick={addExpense}>REGISTRAR GASTO</button>
            </div>
          </ModalBox>
        </Backdrop>)}

        {/* Edit Expense */}
        {editExpModal&&editExpD&&(<Backdrop onClose={()=>{setEditExpModal(false);setEditExpD(null);}}>
          <ModalBox width={440}>
            <ModalHdr title={editExpD.desc||"Editar Gasto"} sub="EDITAR GASTO" onClose={()=>{setEditExpModal(false);setEditExpD(null);}}/>
            <div style={{padding:"1.5rem 2rem"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:".85rem"}}>
                <div><FL>Fecha *</FL><Inp type="date" value={editExpD.date} onChange={e=>setEditExpD({...editExpD,date:e.target.value})}/></div>
                <div><FL>Monto ($) *</FL><Inp type="number" min="0" step="0.01" value={editExpD.amount} onChange={e=>setEditExpD({...editExpD,amount:e.target.value})}/></div>
              </div>
              <div style={{marginBottom:".85rem"}}><FL>Categoría</FL><Sel value={editExpD.category} onChange={e=>setEditExpD({...editExpD,category:e.target.value})}>{["Limpieza","Mantenimiento","Suministros","Servicios","Comisiones","Marketing","Otros"].map(c=><option key={c}>{c}</option>)}</Sel></div>
              <div style={{marginBottom:".85rem"}}><FL>Descripción *</FL><Inp value={editExpD.desc} onChange={e=>setEditExpD({...editExpD,desc:e.target.value})}/></div>
              <label style={{display:"flex",alignItems:"center",gap:".5rem",fontFamily:"'Lato',sans-serif",fontSize:".85rem",cursor:"pointer",marginBottom:"1.4rem"}}><input type="checkbox" checked={editExpD.paid} onChange={e=>setEditExpD({...editExpD,paid:e.target.checked})}/> Ya fue pagado</label>
              <div style={{display:"flex",gap:".65rem"}}>
                <button className="btn-gold" style={{flex:1,fontSize:".82rem"}} onClick={saveExpense}>GUARDAR CAMBIOS</button>
                <button className="btn-danger" style={{padding:".75rem 1.2rem"}} onClick={()=>{if(window.confirm('¿Eliminar este gasto?')){deleteExpense(editExpD.id);setEditExpModal(false);setEditExpD(null);}}}>🗑️ Eliminar</button>
              </div>
            </div>
          </ModalBox>
        </Backdrop>)}

        {/* Edit Settings */}
        {editSettings&&(<Backdrop onClose={()=>setEditSettings(false)}>
          <ModalBox>
            <ModalHdr title="Editar Configuración" onClose={()=>setEditSettings(false)}/>
            <div style={{padding:"1.5rem 2rem"}}>
              {settErr&&<div className="error-banner" role="alert">{settErr}</div>}
              {[["propName","Nombre del Negocio"],["phone","Teléfono"],["whatsapp","WhatsApp (con código de país, ej. +1 809 603 3038)"],["email","Email"],["checkIn","Hora Check-in"],["checkOut","Hora Check-out"],["instagram","Instagram"],["heroSubtitle","Subtítulo del Hero"]].map(([k,l])=>(
                <div key={k} style={{marginBottom:".85rem"}}><FL htmlFor={`st-${k}`}>{l}</FL><Inp id={`st-${k}`} type={k==="whatsapp"||k==="phone"?"tel":"text"} value={settDraft[k]??""} onChange={e=>setSettDraft({...settDraft,[k]:e.target.value})}/></div>
              ))}
              <div style={{marginBottom:".85rem"}}><FL htmlFor="st-min">Noches mínimas por reserva (web)</FL><Inp id="st-min" type="number" min="1" max={MAX_NIGHTS} value={settDraft.minNights??1} onChange={e=>setSettDraft({...settDraft,minNights:e.target.value})}/></div>
              <div style={{marginBottom:".85rem"}}><FL>Dirección</FL><textarea value={settDraft.address} onChange={e=>setSettDraft({...settDraft,address:e.target.value})} style={{width:"100%",padding:".7rem 1rem",border:`1px solid ${C.sand}`,fontFamily:"'Lato',sans-serif",fontSize:".88rem",background:C.smoke,height:65,resize:"vertical",outline:"none",color:C.ebony}}/></div>
              <div style={{marginBottom:"1.25rem"}}><FL>Impuesto (%)</FL><Inp type="number" value={settDraft.taxRate??0} onChange={e=>setSettDraft({...settDraft,taxRate:e.target.value===""?"":Number(e.target.value)})}/></div>
              <button className="btn-gold" style={{width:"100%"}} disabled={saving} onClick={saveSettings}>{saving?"GUARDANDO…":"GUARDAR"}</button>
            </div>
          </ModalBox>
        </Backdrop>)}

        {/* Add Message */}
        {addMsgModal&&(<Backdrop onClose={()=>setAddMsgModal(false)}>
          <ModalBox width={460}>
            <ModalHdr title="Añadir Mensaje" onClose={()=>setAddMsgModal(false)}/>
            <div style={{padding:"1.5rem 2rem"}}>
              {[["guest","Nombre","text"],["email","Email","email"],["phone","Teléfono","tel"]].map(([f,l,tp])=>(
                <div key={f} style={{marginBottom:".85rem"}}><FL>{l}</FL><Inp type={tp} value={newMsg[f]} onChange={e=>setNewMsg({...newMsg,[f]:e.target.value})}/></div>
              ))}
              <div style={{marginBottom:"1.25rem"}}><FL>Mensaje</FL><textarea value={newMsg.message} onChange={e=>setNewMsg({...newMsg,message:e.target.value})} style={{width:"100%",padding:".7rem",border:`1px solid ${C.sand}`,fontFamily:"'Lato',sans-serif",fontSize:".88rem",background:C.smoke,height:80,resize:"vertical",outline:"none",color:C.ebony}}/></div>
              <button className="btn-gold" style={{width:"100%"}} disabled={saving} onClick={addMessage}>{saving?"GUARDANDO…":"GUARDAR"}</button>
            </div>
          </ModalBox>
        </Backdrop>)}

      </div>
    );
  } // end admin


  // ═══════════════════════════════════════════════════════════════════
  // PUBLIC SITE
  // ═══════════════════════════════════════════════════════════════════
  const L = lang==="es"?0:1;
  const today = todaySD();
  const roomName = (r) => lang==="es" ? r?.name : (r?.nameEn||r?.name);
  const roomDesc = (r) => lang==="en" && r?.descEn ? r.descEn : r?.desc;
  const bedLabel = (b) => BED_LABELS[b] ? BED_LABELS[b][L] : (b||"");
  const amenityLabel = (a) => AMENITY_LABELS[a] ? AMENITY_LABELS[a][L] : a;
  const photoLabel = (l) => lang==="en" ? (PHOTO_LABELS_EN[l] || String(l||"").replace(/^Foto (\d+)$/,"Photo $1")) : l;
  const galLabel = (g) => lang==="es" ? g.label : (g.labelEn||g.label);
  const searchErr = validateStay(availDates.checkIn, availDates.checkOut, today, minNights);
  const searchValid = !searchErr;
  const datesChecked = bookedRoomIds!==null;
  const availableCount = datesChecked ? rooms.filter(r=>!isRoomClosed(r)&&!bookedRoomIds.includes(r.id)).length : null;
  const anyModalOpen = bookModal||galOpen!==null||roomLightbox!==null||!!amenModal||showPrivacy||guestPortalOpen||!!reviewParam;
  const otherLang = lang==="es"?"en":"es";
  const plainClick = (e) => !(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||(e.button!=null&&e.button!==0));
  const switchLang = (e) => {
    if(!plainClick(e)) return;
    e.preventDefault();
    setLang(otherLang); setMenuOpen(false);
    try{ window.history.pushState(null,"",pathFor(otherLang,page)+window.location.search+window.location.hash); }catch{}
  };
  const goTop = (e) => { if(!plainClick(e)) return; e.preventDefault(); setMenuOpen(false); window.scrollTo({top:0,behavior:"smooth"}); };
  const openAdmin = () => { try{sessionStorage.setItem('c35_view','admin');}catch{} setView("admin"); window.scrollTo(0,0); };
  const sections = [["rooms",t("Habitaciones","Rooms")],["gallery",t("Galería","Gallery")],["amenities",t("Servicios","Services")],["contact",t("Contacto","Contact")]];
  const heroSubtitle = lang==="en" && (!settings.heroSubtitle || settings.heroSubtitle===SETTINGS_INIT.heroSubtitle) ? HERO_SUBTITLE_EN : settings.heroSubtitle;
  const waLink = (text) => `https://wa.me/${settings.whatsapp}${text?`?text=${encodeURIComponent(text)}`:""}`;
  const nightsWord = (n) => n===1 ? t("noche","night") : t("noches","nights");
  const langLink = (cls) => (
    <a className={cls} href={pathFor(otherLang,page)} hrefLang={otherLang} lang={otherLang} onClick={switchLang} aria-label={lang==="es"?"English":"Español"}>{lang==="es"?"EN":"ES"}</a>
  );

  const submitReview = async (e) => {
    e.preventDefault();
    if(reviewForm.sending) return;
    if(!reviewForm.body.trim()){ setReviewForm(f=>({...f,err:t("Escribe algo, por favor.","Please write something.")})); return; }
    setReviewForm(f=>({...f,sending:true,err:""}));
    try{
      const payload = {bookingId:Number(reviewParam),token:reviewToken,rating:reviewForm.rating,body:reviewForm.body.trim()};
      if(reviewForm.name.trim()) payload.name = reviewForm.name.trim();
      const res = await fetch('/api/submit-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(res.ok){ setReviewForm(f=>({...f,done:true,sending:false,err:""})); return; }
      const msg = res.status===409 ? t("Ya recibimos una reseña para esta estadía. ¡Gracias!","We already have a review for this stay. Thank you!")
        : res.status===429 ? t("Demasiados intentos. Intenta más tarde.","Too many attempts. Please try again later.")
        : (res.status>=400&&res.status<500) ? t("No pudimos verificar este enlace de reseña. Puede que haya expirado o que tu estadía aún no haya terminado.","We couldn’t verify this review link. It may have expired, or your stay may not have ended yet.")
        : t("No pudimos enviar tu reseña. Intenta de nuevo.","We couldn’t send your review. Please try again.");
      setReviewForm(f=>({...f,sending:false,err:msg}));
    }catch{ setReviewForm(f=>({...f,sending:false,err:t("Error de conexión. Intenta de nuevo.","Connection error. Please try again.")})); }
  };

  return(
    <div style={{fontFamily:"'Cormorant Garamond',serif",background:C.ivory,minHeight:"100vh",color:C.ebony}}>
      <style>{css}</style>
      <a className="skip-link" href="#main">{t("Saltar al contenido","Skip to content")}</a>

      {/* NAV — desktop links above 960px; logo + language + menu button below */}
      <header>
        <nav ref={navRef} className="c35-nav" aria-label={t("Principal","Main")}>
          <a className="nav-logo" href={pathFor(lang,"home")} onClick={goTop} aria-label={t("Caonabo 35, ir al inicio","Caonabo 35, back to top")}>
            <span className="nav-logo-name">CAONABO 35</span>
            <span className="nav-logo-sub">Santo Domingo · R.D.</span>
          </a>
          <div className="nav-desk">
            {sections.map(([id,lbl])=><a key={id} className="nav-lnk" href={`#${id}`}>{lbl}</a>)}
            {langLink("nav-lang")}
            <button type="button" className="nav-mine" onClick={()=>setGuestPortalOpen(true)}>{t("MI RESERVA","MY BOOKING")}</button>
          </div>
          <div className="nav-mob">
            {langLink("nav-lang")}
            <button ref={menuBtnRef} type="button" className="nav-burger" aria-expanded={menuOpen} aria-controls="c35-menu"
              aria-label={menuOpen?t("Cerrar menú","Close menu"):t("Abrir menú","Open menu")} onClick={()=>setMenuOpen(o=>!o)}>
              <span aria-hidden="true">{menuOpen?"×":"☰"}</span>
            </button>
          </div>
          {menuOpen&&(
            <div id="c35-menu" className="nav-menu">
              {sections.map(([id,lbl])=><a key={id} href={`#${id}`} onClick={()=>setMenuOpen(false)}>{lbl}</a>)}
              <button type="button" onClick={()=>{setMenuOpen(false);setGuestPortalOpen(true);}}>{t("Mi reserva","My booking")}</button>
            </div>
          )}
        </nav>
      </header>

      <main id="main" tabIndex={-1} style={{outline:"none"}}>
      {/* HERO */}
      <section aria-labelledby="hero-title" style={{position:"relative",height:"100vh",minHeight:550,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <img src={I.terrace} alt={t("Terraza de Caonabo 35 al anochecer","Caonabo 35 terrace at dusk")} fetchpriority="high" decoding="async" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(160deg,rgba(26,15,8,.78),rgba(42,31,22,.5) 50%,rgba(26,15,8,.8))"}}/>
        <div style={{position:"relative",textAlign:"center",padding:"2rem 1rem"}} className="fadein">
          <p style={{color:C.gold,fontSize:".68rem",letterSpacing:".38em",fontFamily:"'Lato',sans-serif",textTransform:"uppercase",marginBottom:"1.4rem"}}>{t("Av. Caonabo #35, 2do Piso · Santo Domingo","Av. Caonabo #35, 2nd Floor · Santo Domingo")}</p>
          <h1 id="hero-title" style={{color:C.ivory,fontWeight:300,marginBottom:"1.3rem"}}>
            <span style={{display:"block",fontSize:"clamp(3.2rem,8vw,6.5rem)",letterSpacing:".06em",lineHeight:.92}}>Caonabo <em style={{color:C.goldLight,fontStyle:"italic"}}>35</em></span>
            <span className="sr-only"> — </span>
            <span className="h1-sub">{t("Hotel boutique en Santo Domingo","Boutique hotel in Santo Domingo")}</span>
          </h1>
          <p style={{color:C.sand,fontSize:"clamp(.9rem,2vw,1.05rem)",fontStyle:"italic",maxWidth:500,margin:"0 auto 2.5rem",lineHeight:1.9}}>{heroSubtitle}</p>
          <div style={{display:"flex",gap:"1rem",justifyContent:"center",flexWrap:"wrap",marginBottom:"5rem"}}>
            <a className="btn-gold" href="#rooms">{t("VER HABITACIONES","VIEW ROOMS")}</a>
            <a className="btn-out" href={waLink()} target="_blank" rel="noopener noreferrer">WHATSAPP</a>
          </div>
          <div style={{display:"flex",gap:"3.5rem",justifyContent:"center",flexWrap:"wrap"}}>
            {[["7",t("Habitaciones","Rooms")],["4.9",t("Estrellas","Stars")],["100+",t("Huéspedes","Guests")],["24/7",t("Servicio","Service")]].map(([n,l])=>(
              <div key={l}><div style={{color:C.gold,fontSize:"2rem",fontWeight:600,lineHeight:1}}>{n}</div><div style={{color:C.sand,fontSize:".65rem",fontFamily:"'Lato',sans-serif",letterSpacing:".18em",textTransform:"uppercase",marginTop:".28rem"}}>{l}</div></div>
            ))}
          </div>
        </div>
        <a href="#rooms" className="hero-cue" aria-label={t("Ir a las habitaciones","Go to the rooms")} style={{position:"absolute",bottom:"1rem",left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:".3rem",opacity:.8,textDecoration:"none",padding:".5rem"}}>
          <span aria-hidden="true" style={{color:C.sand,fontSize:".6rem",fontFamily:"'Lato',sans-serif",letterSpacing:".2em",textTransform:"uppercase"}}>{t("desliza","scroll")}</span>
          <span aria-hidden="true" style={{width:1,height:30,background:`linear-gradient(${C.gold},transparent)`}}/>
        </a>
      </section>

      {/* PHOTO STRIP */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",height:220}}>
        {[1,5,6,8].map(gi=>{ const g=GALLERY[gi]; return(
          <a key={gi} href="#gallery" aria-label={`${t("Galería","Gallery")}: ${galLabel(g)}`} style={{overflow:"hidden",display:"block"}}>
            <img src={g.photo} alt={galLabel(g)} loading="lazy" decoding="async" style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform .5s",display:"block"}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.05)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>
          </a>
        );})}
      </div>

      {/* ROOMS */}
      <section id="rooms" aria-labelledby="rooms-title" className="sec-pad" style={{background:C.ivory,padding:"5.5rem 2rem"}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <SHead id="rooms-title" eyebrow={t("ALOJAMIENTO","ACCOMMODATION")} title={t("Nuestras Habitaciones","Our Rooms")}/>

          {/* ── Availability Checker ── */}
          <form noValidate onSubmit={e=>{e.preventDefault();checkAvailability();}} aria-labelledby="avail-title" style={{background:C.ebony,padding:"1.75rem 1.25rem",marginBottom:"2.5rem",borderTop:`3px solid ${C.gold}`}}>
            <p id="avail-title" style={{color:C.gold,fontSize:".63rem",fontFamily:"'Lato',sans-serif",letterSpacing:".28em",textTransform:"uppercase",textAlign:"center",marginBottom:"1.1rem"}}>{t("VERIFICAR DISPONIBILIDAD","CHECK AVAILABILITY")}</p>
            <div style={{display:"flex",gap:"1rem",alignItems:"flex-end",flexWrap:"wrap",justifyContent:"center"}}>
              <div>
                <label htmlFor="av-in" style={{display:"block",color:C.taupe,fontSize:".62rem",fontFamily:"'Lato',sans-serif",letterSpacing:".15em",textTransform:"uppercase",marginBottom:".35rem"}}>{t("Llegada","Check-in")}</label>
                <input id="av-in" type="date" min={today} max={addDays(today,MAX_ADVANCE_DAYS)} value={availDates.checkIn}
                  onChange={e=>setSearchDate("checkIn",e.target.value)}
                  style={{background:C.mahogany,border:`1px solid ${C.gold}40`,color:C.ivory,padding:".65rem 1rem",fontFamily:"'Lato',sans-serif",fontSize:".87rem",colorScheme:"dark",minHeight:44}}/>
              </div>
              <div>
                <label htmlFor="av-out" style={{display:"block",color:C.taupe,fontSize:".62rem",fontFamily:"'Lato',sans-serif",letterSpacing:".15em",textTransform:"uppercase",marginBottom:".35rem"}}>{t("Salida","Check-out")}</label>
                <input id="av-out" type="date" min={isYmd(availDates.checkIn)?addDays(availDates.checkIn,1):addDays(today,1)} value={availDates.checkOut}
                  onChange={e=>setSearchDate("checkOut",e.target.value)}
                  style={{background:C.mahogany,border:`1px solid ${C.gold}40`,color:C.ivory,padding:".65rem 1rem",fontFamily:"'Lato',sans-serif",fontSize:".87rem",colorScheme:"dark",minHeight:44}}/>
              </div>
              <button type="submit" className="btn-gold" style={{padding:".72rem 2rem",fontSize:".75rem",letterSpacing:".12em",minHeight:44}} disabled={availLoading||!searchValid}>
                {availLoading?t("Buscando...","Searching..."):t("BUSCAR HABITACIÓN","SEARCH")}
              </button>
            </div>
            <div aria-live="polite" style={{textAlign:"center",fontFamily:"'Lato',sans-serif",fontSize:".82rem"}}>
              {availError&&<p style={{marginTop:"1rem",color:"#F4B6A8"}}>{availError}</p>}
              {searchErr?.code==="min_nights"&&<p style={{marginTop:"1rem",color:"#F4B6A8"}}>{stayErrorText("min_nights",lang,searchErr.min)}</p>}
              {datesChecked&&!availError&&(
                <p style={{marginTop:"1rem",color:C.taupe}}>
                  {availableCount===rooms.length
                    ? t("✓ Todas las habitaciones están disponibles para esas fechas.","✓ All rooms are available for those dates.")
                    : availableCount===0
                      ? t("No quedan habitaciones para esas fechas. Escríbenos por WhatsApp y te ayudamos.","No rooms are left for those dates. Message us on WhatsApp and we’ll help.")
                      : t(`${availableCount} de ${rooms.length} habitaciones disponibles para esas fechas.`,`${availableCount} of ${rooms.length} rooms available for those dates.`)}
                </p>
              )}
            </div>
          </form>

          <div className="lt" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(340px,100%),1fr))",gap:"1.5rem"}}>
            {(()=>{const todaySeason=activeRecurringSeason(seasons,today);return rooms.map(room=>{
              const closed = isRoomClosed(room);
              const bookedHere = datesChecked && bookedRoomIds.includes(room.id);
              const unavailable = closed || bookedHere;
              const q = quoteRoom(room, datesChecked&&searchValid?availDates.checkIn:"", datesChecked&&searchValid?availDates.checkOut:"");
              const name = roomName(room);
              const photos = roomPhotos(room);
              const cover = photos[0]?.url;
              const photoAlt = `${name} — ${bedLabel(room.beds)}`;
              // Neutral until the guest has picked dates; a room the owner closed is always unavailable.
              const badge = closed ? {txt:t("NO DISPONIBLE","UNAVAILABLE"),bg:"#666",fg:"#fff"}
                : !datesChecked ? null
                : bookedHere ? {txt:t("NO DISPONIBLE","UNAVAILABLE"),bg:C.danger,fg:"#fff"}
                : {txt:t("DISPONIBLE","AVAILABLE"),bg:C.gold,fg:C.ebony};
              return(
              <article key={room.id} className="room-card" aria-labelledby={`room-${room.id}-name`}>
                <div style={{height:245,position:"relative",overflow:"hidden"}}>
                  <button type="button" className="rm-photo" disabled={!roomsLoaded||!cover} onClick={()=>setRoomLightbox({photos,name,idx:0})}
                    aria-label={t(`Ver fotos: ${photoAlt}`,`View photos: ${photoAlt}`)}>
                    {roomsLoaded&&cover
                      ? <img src={cover} alt={photoAlt} loading="lazy" decoding="async" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                      : <span className="skel" aria-hidden="true" style={{display:"block",width:"100%",height:"100%"}}/>}
                  </button>
                  <div aria-hidden="true" style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(26,15,8,.85) 0%,transparent 55%)",pointerEvents:"none"}}/>
                  <div className="rm-ovr" aria-hidden="true" style={{position:"absolute",inset:0,background:"rgba(26,15,8,.55)",display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity .3s"}}>
                    {unavailable
                      ? <span style={{color:"#fff",fontFamily:"'Lato',sans-serif",fontSize:".72rem",fontWeight:700,letterSpacing:".15em"}}>{t("NO DISPONIBLE","UNAVAILABLE")}</span>
                      : roomsLoaded&&<button type="button" tabIndex={-1} className="btn-gold" onClick={()=>openBooking(room)}>{t("RESERVAR","BOOK NOW")}</button>}
                  </div>
                  {badge&&<div style={{position:"absolute",top:"1rem",right:"1rem",background:badge.bg,color:badge.fg,padding:".2rem .85rem",fontSize:".64rem",fontFamily:"'Lato',sans-serif",fontWeight:700,letterSpacing:".1em",pointerEvents:"none"}}>{badge.txt}</div>}
                  <div style={{position:"absolute",bottom:"1.25rem",left:"1.5rem",right:"1rem",pointerEvents:"none"}}>
                    <h3 id={`room-${room.id}-name`} style={{color:C.ivory,fontSize:"1.25rem",fontWeight:500}}>{name}</h3>
                    <div style={{color:C.goldLight,fontSize:".71rem",fontFamily:"'Lato',sans-serif",letterSpacing:".1em",marginTop:".18rem"}}>{room.size} · {bedLabel(room.beds)}</div>
                  </div>
                </div>
                <div style={{padding:"1.4rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:".9rem",gap:".75rem",flexWrap:"wrap"}}>
                    {roomsLoaded?(
                      <div style={{display:"flex",flexDirection:"column",gap:".1rem"}}>
                        {q.discounted&&<span style={{fontFamily:"'Lato',sans-serif",fontSize:".73rem",color:C.taupeText,textDecoration:"line-through"}}><span className="sr-only">{t("Antes: ","Was: ")}</span>{"$"+q.baseRate+"/"+t("noche","night")}</span>}
                        <div><span data-rate={q.rate} style={{fontSize:"1.65rem",fontWeight:600,color:q.discounted?C.goldText:C.warm}}>{"$"+q.rate}</span><span style={{color:C.taupeText,fontSize:".78rem",fontFamily:"'Lato',sans-serif"}}> /{t("noche","night")}</span>{q.discounted&&<span style={{background:C.gold,color:C.ebony,fontSize:".62rem",fontWeight:700,padding:".1rem .35rem",marginLeft:".4rem",fontFamily:"'Lato',sans-serif"}}>{"- "+q.discountPct+"%"}</span>}</div>
                        {q.valid&&!unavailable&&<span style={{fontFamily:"'Lato',sans-serif",fontSize:".76rem",color:C.mahogany}}>{`${q.nights} ${nightsWord(q.nights)}: ${fmtMoney(q.total)}`}</span>}
                      </div>
                    ):<span className="skel" aria-hidden="true" style={{display:"block",width:120,height:40}}/>}
                    <span style={{color:C.taupeText,fontSize:".78rem",fontFamily:"'Lato',sans-serif"}}>{t(`Hasta ${room.guests} huéspedes`,`Up to ${room.guests} guests`)}</span>
                  </div>
                  <p style={{color:C.taupeText,fontFamily:"'Lato',sans-serif",fontSize:".82rem",lineHeight:1.6,marginBottom:".9rem",fontStyle:"italic"}}>{roomDesc(room)}</p>
                  <ul style={{display:"flex",flexWrap:"wrap",gap:".35rem",marginBottom:"1.1rem",listStyle:"none"}} aria-label={t("Comodidades","Amenities")}>
                    {(room.amenities||[]).map(a=><li key={a} style={{background:C.smoke,color:C.mahogany,padding:".18rem .72rem",fontSize:".68rem",fontFamily:"'Lato',sans-serif",borderRadius:20}}>{amenityLabel(a)}</li>)}
                  </ul>
                  {todaySeason&&<div style={{background:C.gold,color:C.ebony,fontFamily:"'Lato',sans-serif",fontSize:".63rem",fontWeight:700,padding:".15rem .55rem",display:"inline-block",marginBottom:".5rem",letterSpacing:".05em"}}>🌡️ {todaySeason.name} +{todaySeason.pct}%</div>}
                  <button type="button" className="btn-gold" style={{width:"100%"}} disabled={unavailable||!roomsLoaded} onClick={()=>openBooking(room)}>
                    {closed?t("NO DISPONIBLE","NOT AVAILABLE"):bookedHere?t("NO DISPONIBLE EN ESAS FECHAS","NOT AVAILABLE FOR THOSE DATES"):t("RESERVAR AHORA","BOOK NOW")}
                    <span className="sr-only"> — {name}</span>
                  </button>
                </div>
              </article>
            );});})()}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" aria-labelledby="gallery-title" className="sec-pad" style={{background:C.ebony,padding:"5.5rem 2rem"}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <SHead id="gallery-title" eyebrow={t("FOTOGRAFÍA","PHOTOGRAPHY")} title={t("Galería","Gallery")} dark/>
          <div role="group" aria-label={t("Filtrar fotos","Filter photos")} style={{display:"flex",gap:".5rem",justifyContent:"center",flexWrap:"wrap",marginBottom:"2.5rem"}}>
            {[["all",t("Todo","All")],["outdoor",t("Exterior","Outdoor")],["living",t("Salas","Living")],["bedroom",t("Habitaciones","Rooms")],["bathroom",t("Baños","Bathrooms")],["common",t("Áreas Comunes","Common")],["detail",t("Detalles","Details")]].map(([f,l])=>(
              <button key={f} type="button" className={`tog${galFilter===f?" act":""}`} aria-pressed={galFilter===f} onClick={()=>setGalFilter(f)}>{l}</button>
            ))}
          </div>
          <div style={{columns:"3 240px",gap:5,lineHeight:0}}>
            {galItems.map((g,i)=>{
              const label = galLabel(g);
              return(
                <button key={g.photo+i} type="button" className="gal-item" style={{breakInside:"avoid",marginBottom:5}} onClick={()=>setGalOpen(i)} aria-label={t(`Ampliar foto: ${label}`,`Enlarge photo: ${label}`)}>
                  <img src={g.photo} alt={label} loading="lazy" decoding="async" style={{width:"100%",height:g.featured?300:180,objectFit:"cover",display:"block"}}/>
                  <span className="gal-cap" aria-hidden="true" style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(26,15,8,.7))",padding:".85rem .9rem",opacity:0,transition:"opacity .3s",lineHeight:1.4,textAlign:"left",display:"block"}}>
                    <span style={{color:C.parchment,fontSize:".7rem",fontFamily:"'Lato',sans-serif",letterSpacing:".1em",textTransform:"uppercase"}}>{label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* AMENITIES */}
      <section id="amenities" aria-labelledby="amen-title" className="sec-pad lt" style={{background:C.ivory,padding:"5.5rem 2rem"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <SHead id="amen-title" eyebrow={t("INSTALACIONES","FACILITIES")} title={t("Servicios & Amenidades","Services & Amenities")}/>
          {AMENITY_CATS.map(([catEs,catEn])=>(
            <div key={catEs} style={{marginBottom:"3rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:"1.4rem",marginBottom:"1px"}}>
                <h3 style={{color:C.goldText,fontSize:".63rem",fontFamily:"'Lato',sans-serif",letterSpacing:".28em",textTransform:"uppercase",flexShrink:0,fontWeight:400}}>{lang==="es"?catEs:catEn}</h3>
                <div aria-hidden="true" style={{flex:1,height:1,background:`linear-gradient(90deg,${C.gold}60,transparent)`}}/>
              </div>
              <ul style={{border:`1px solid ${C.parchment}`,listStyle:"none"}}>
                {AMENITIES.filter(a=>a.cat===catEs).map((item,ii,arr)=>{
                  const nm = lang==="es"?item.name:item.nameEn;
                  const ds = lang==="es"?item.desc:item.descEn;
                  const idb = `am-${catEs}-${ii}`;
                  return(
                  <li key={item.name}>
                    <button type="button" className="am-row" style={{borderBottom:ii<arr.length-1?`1px solid ${C.parchment}`:"none"}} onClick={()=>setAmenModal(item)} aria-labelledby={`${idb}-n`} aria-describedby={`${idb}-d`}>
                      <span style={{width:56,height:56,overflow:"hidden",flexShrink:0,display:"block"}}><img src={item.photo} alt={nm} loading="lazy" decoding="async" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/></span>
                      <span style={{flex:1,display:"block"}}>
                        <span id={`${idb}-n`} style={{display:"block",fontSize:"1rem",fontWeight:500,color:C.ebony,marginBottom:".15rem"}}>{nm}</span>
                        <span id={`${idb}-d`} style={{display:"block",fontSize:".79rem",color:C.taupeText,fontFamily:"'Lato',sans-serif",fontStyle:"italic",lineHeight:1.5}}>{ds.split(".")[0]}.</span>
                      </span>
                      <span className="am-arr" aria-hidden="true" style={{color:C.goldText,fontSize:"1.1rem",opacity:.35,transition:"all .2s",flexShrink:0}}>›</span>
                    </button>
                  </li>
                );})}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" aria-labelledby="reviews-title" className="sec-pad lt" style={{background:C.parchment,padding:"5rem 2rem"}}>
        <div style={{maxWidth:1000,margin:"0 auto"}}>
          <SHead id="reviews-title" eyebrowColor={C.goldTextDeep} eyebrow={t("TESTIMONIOS","TESTIMONIALS")} title={t("Lo Que Dicen Nuestros Huéspedes","What Our Guests Say")}/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(400px,100%),1fr))",gap:"1.5rem"}}>
            {(()=>{
              // Real verified reviews first, then sample testimonials fill up to 6 — as real ones
              // accumulate they push the samples out (samples stay in code as filler for now).
              const real=dbReviews.filter(r=>r.approved).map(r=>({rating:r.rating,text:r.body,guest:r.name,country:t("✓ Estadía verificada","✓ Verified stay"),date:r.created_at?r.created_at.slice(0,10):""}));
              const samples=reviews.filter(r=>r.approved);
              return [...real,...samples].slice(0,6).map((r,i)=>(
                <figure key={i} style={{background:C.white,padding:"2rem 1.6rem",borderTop:`3px solid ${C.gold}`,minWidth:0}}>
                  <div role="img" aria-label={t(`${r.rating} de 5 estrellas`,`${r.rating} out of 5 stars`)} style={{color:C.goldText,letterSpacing:3,marginBottom:".9rem",fontSize:".86rem"}}>{"★".repeat(r.rating)}</div>
                  <blockquote style={{color:C.ebony,lineHeight:1.85,fontSize:".95rem",fontStyle:"italic",marginBottom:"1.2rem"}}>"{r.text}"</blockquote>
                  <figcaption style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"'Lato',sans-serif",gap:".5rem",flexWrap:"wrap"}}>
                    <div><span style={{fontWeight:700,color:C.mahogany,fontSize:".82rem"}}>{r.guest}</span><span style={{color:C.taupeText,fontSize:".75rem",marginLeft:".5rem"}}>{r.country}</span></div>
                    <span style={{color:C.taupeText,fontSize:".73rem"}}>{r.date}</span>
                  </figcaption>
                </figure>
              ));
            })()}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" aria-labelledby="contact-title" className="sec-pad" style={{background:C.ebony,padding:"5.5rem 2rem"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <SHead id="contact-title" eyebrow={t("CONTACTO","CONTACT")} title={t("Encuéntranos","Find Us")} dark/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1.7fr",gap:"3.5rem",alignItems:"start"}} className="mob-full mob-stack">
            <div style={{minWidth:0}}>
              {[[t("Dirección","Address"),settings.address,"https://maps.google.com/?q=Caonabo+35+Santo+Domingo",true],[t("WhatsApp y teléfono","WhatsApp & Phone"),settings.phone,waLink(),true],[t("Correo electrónico","Email"),settings.email,`mailto:${settings.email}`,false],[t("Entrada / Salida","Check-in / Check-out"),`${settings.checkIn} / ${settings.checkOut}`,null],["Instagram",settings.instagram,`https://instagram.com/${String(settings.instagram||"").replace("@","")}`,true]].map(([l,v,href,ext])=>(
                <div key={l} style={{borderBottom:`1px solid ${C.mahogany}55`,padding:"1.15rem 0"}}>
                  <div style={{color:C.gold,fontSize:".62rem",fontFamily:"'Lato',sans-serif",letterSpacing:".2em",textTransform:"uppercase",marginBottom:".35rem"}}>{l}</div>
                  {href?<a href={href} {...(ext?{target:"_blank",rel:"noopener noreferrer"}:{})} style={{color:C.parchment,textDecoration:"none",fontFamily:"'Lato',sans-serif",fontSize:".88rem",lineHeight:1.6,whiteSpace:"pre-line",overflowWrap:"anywhere"}}>{v}</a>:<p style={{color:C.parchment,fontFamily:"'Lato',sans-serif",fontSize:".88rem",lineHeight:1.6,whiteSpace:"pre-line"}}>{v}</p>}
                </div>
              ))}
              <div style={{display:"flex",flexDirection:"column",gap:".7rem",marginTop:"1.6rem"}}>
                <a className="btn-gold" style={{width:"100%"}} href={waLink()} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">📱</span> {t("ESCRIBIR POR WHATSAPP","WHATSAPP US")}</a>
                <a className="btn-out" style={{width:"100%"}} href={`mailto:${settings.email}`}><span aria-hidden="true">✉️</span> {t("ENVIAR EMAIL","SEND EMAIL")}</a>
              </div>
            </div>
            <div style={{minWidth:0}}>
              <div style={{position:"relative",paddingBottom:"58%",height:0,overflow:"hidden",border:`1px solid ${C.mahogany}`}}>
                <iframe title={t("Mapa de Caonabo 35","Map of Caonabo 35")} src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3784.123!2d-69.9670143!3d18.4472324!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTjCsDI2JzUwLjAiTiA2OcKwNTgnMDEuMyJX!5e0!3m2!1ses!2sdo!4v1711000000000" style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:0}} allowFullScreen loading="lazy"/>
              </div>
              <a className="btn-out" style={{width:"100%",marginTop:".7rem"}} href="https://maps.google.com/?q=18.4472324,-69.9670143" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">📍</span> {t("ABRIR EN GOOGLE MAPS","OPEN IN GOOGLE MAPS")}</a>
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* FOOTER */}
      <footer style={{background:"#1A0F08",padding:"2.25rem 1rem",textAlign:"center",borderTop:`1px solid ${C.mahogany}40`}}>
        <div style={{color:C.gold,fontSize:"1.35rem",fontWeight:600,letterSpacing:".12em",marginBottom:".38rem"}}>CAONABO 35</div>
        <p style={{color:C.taupe,fontFamily:"'Lato',sans-serif",fontSize:".74rem",letterSpacing:".07em",marginBottom:".8rem"}}>{t("Av. Caonabo #35, 2do Piso · Santo Domingo, R.D.","Av. Caonabo #35, 2nd Floor · Santo Domingo, D.R.")}</p>
        <div style={{display:"flex",gap:".25rem 1.25rem",justifyContent:"center",flexWrap:"wrap",marginBottom:".5rem"}}>
          <a className="foot-lnk" href={waLink()} target="_blank" rel="noopener noreferrer">{settings.phone}</a>
          <a className="foot-lnk" href={`mailto:${settings.email}`}>{settings.email}</a>
          <a className="foot-lnk" href={`https://instagram.com/${String(settings.instagram||"").replace("@","")}`} target="_blank" rel="noopener noreferrer">{settings.instagram}</a>
        </div>
        <div style={{color:"#A89886",fontFamily:"'Lato',sans-serif",fontSize:".7rem",display:"flex",gap:"0 .6rem",justifyContent:"center",alignItems:"center",flexWrap:"wrap"}}>
          <span>© {today.slice(0,4)} Caonabo 35 · {t("Todos los derechos reservados","All rights reserved")}</span>
          <button type="button" className="foot-lnk" style={{textDecoration:"underline",fontSize:".7rem",color:"#C9B9A6"}} onClick={()=>setShowPrivacy(true)}>{t("Política de Privacidad","Privacy Policy")}</button>
          {/* Owner's way into the back office (moved out of the public nav) */}
          <button type="button" className="foot-lnk" style={{fontSize:".66rem",color:"#948472"}} onClick={openAdmin}>Admin</button>
        </div>

        {/* Floating WhatsApp booking CTA — hidden while a dialog or the menu is open */}
        {!anyModalOpen&&!menuOpen&&(
          <a className="wa-fab" href={waLink(t("¡Hola! Quiero reservar en Caonabo 35.","Hi! I'd like to book at Caonabo 35."))} target="_blank" rel="noopener noreferrer" aria-label={t("Reservar por WhatsApp","Book on WhatsApp")}>
            <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 32 32" fill="#fff"><path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.7 5.4 2 7.7L.5 31.5l8-2.1c2.2 1.2 4.8 1.9 7.5 1.9 8.6 0 15.5-6.9 15.5-15.5S24.6.5 16 .5zm0 28.3c-2.4 0-4.7-.7-6.7-1.9l-.5-.3-4.7 1.2 1.3-4.6-.3-.5c-1.3-2.1-2-4.5-2-7 0-7.2 5.9-13.1 13.1-13.1S29.1 8.8 29.1 16 23.2 28.8 16 28.8zm7.2-9.8c-.4-.2-2.3-1.1-2.7-1.3-.4-.1-.6-.2-.9.2-.3.4-1 1.3-1.2 1.5-.2.2-.4.3-.8.1-.4-.2-1.7-.6-3.2-2-1.2-1.1-2-2.4-2.2-2.8-.2-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.2-.4.4-.7.1-.2.1-.5 0-.7-.1-.2-.9-2.1-1.2-2.9-.3-.7-.6-.6-.9-.6h-.7c-.2 0-.6.1-1 .5-.3.4-1.3 1.3-1.3 3.1s1.3 3.6 1.5 3.9c.2.2 2.6 4 6.3 5.6.9.4 1.6.6 2.1.8.9.3 1.7.2 2.3.1.7-.1 2.3-.9 2.6-1.8.3-.9.3-1.6.2-1.8-.1-.1-.3-.2-.7-.4z"/></svg>
            <span className="wa-label">{t("Reservar por WhatsApp","Book on WhatsApp")}</span>
          </a>
        )}
      </footer>
      {toast&&<div className="toast" role="status">{toast}</div>}

      {/* ── PUBLIC MODALS ── */}

      {/* Verified-review submission (link in the post-stay email: /?rev=<bookingId>&t=<review_token>) */}
      {reviewParam&&(()=>{
        const close=()=>{setReviewParam(null);try{window.history.replaceState({},"",window.location.pathname);}catch{}};
        const linkOk = /^\d+$/.test(String(reviewParam)) && !!reviewToken;
        return(
        <Backdrop onClose={close}>
          <ModalBox>
            <ModalHdr title={t("Tu reseña","Your review")} sub="CAONABO 35" onClose={close} closeLabel={t("Cerrar","Close")}/>
            <div style={{padding:"1.5rem 2rem"}} className="modal-pad">
              {!linkOk
                ? <p style={{fontFamily:"'Lato',sans-serif",fontSize:".9rem",color:C.ebony,lineHeight:1.6}}>{t("Este enlace de reseña no es válido o está incompleto. Escríbenos por WhatsApp y con gusto te ayudamos.","This review link is invalid or incomplete. Message us on WhatsApp and we’ll gladly help.")}</p>
                : reviewForm.done
                ? <p role="status" style={{textAlign:"center",color:C.ebony,fontSize:"1rem",padding:"1.4rem 0",lineHeight:1.6}}>{t("¡Gracias por tu reseña! 🙏 La revisaremos y publicaremos pronto.","Thank you for your review! 🙏 We'll review and publish it soon.")}</p>
                : (<form noValidate onSubmit={submitReview}>
                  {reviewForm.err&&<div className="error-banner" role="alert">{reviewForm.err}</div>}
                  <p id="rv-q" style={{fontFamily:"'Lato',sans-serif",fontSize:".85rem",color:C.taupeText,marginBottom:".6rem"}}>{t("¿Cómo estuvo tu estadía en Caonabo 35?","How was your stay at Caonabo 35?")}</p>
                  <div role="group" aria-labelledby="rv-q" style={{textAlign:"center",marginBottom:"1rem"}}>
                    {[1,2,3,4,5].map(n=><button key={n} type="button" aria-pressed={reviewForm.rating===n} aria-label={t(`${n} de 5 estrellas`,`${n} out of 5 stars`)} onClick={()=>setReviewForm(f=>({...f,rating:n}))} style={{color:C.goldText,background:"none",border:"none",fontSize:"2rem",minWidth:44,minHeight:44,cursor:"pointer",lineHeight:1}}>{n<=reviewForm.rating?"★":"☆"}</button>)}
                  </div>
                  <div style={{marginBottom:".85rem"}}><FL htmlFor="rv-name">{t("Tu nombre (opcional)","Your name (optional)")}</FL><Inp id="rv-name" maxLength={60} autoComplete="name" value={reviewForm.name} onChange={e=>setReviewForm(f=>({...f,name:e.target.value}))} placeholder={t("Ej. Juan P.","e.g. John D.")}/></div>
                  <FL htmlFor="rv-body">{t("Tu reseña","Your review")}</FL>
                  <textarea id="rv-body" maxLength={1000} value={reviewForm.body} onChange={e=>setReviewForm(f=>({...f,body:e.target.value}))} placeholder={t("Cuéntanos cómo estuvo tu estadía…","Tell us about your stay…")} className="inp" style={{height:110,resize:"vertical",marginBottom:"1rem"}}/>
                  <button type="submit" className="btn-gold" style={{width:"100%"}} disabled={reviewForm.sending} aria-busy={reviewForm.sending}>{reviewForm.sending?t("Enviando…","Sending…"):t("Enviar reseña","Submit review")}</button>
                </form>)}
            </div>
          </ModalBox>
        </Backdrop>
        );
      })()}

      {/* Booking request: 1) dates + availability + price, 2) contact, 3) ID, 4) confirm */}
      {bookModal&&(()=>{
        const rm = roomById(selRoom);
        if(!rm) return null;
        const f = bookForm;
        const err = fieldErrors;
        const cap = Math.max(1, Number(rm.guests)||2);
        const stayErr = validateStay(f.checkIn, f.checkOut, today, minNights);
        const q = quoteRoom(rm, f.checkIn, f.checkOut);
        const key = `${rm.id}|${f.checkIn}|${f.checkOut}`;
        const st = stayErr ? "idle" : (modalAvail.key===key ? modalAvail.status : "checking");
        const name = roomName(rm);
        const errId = (k) => err[k] ? `bk-${k}-err` : undefined;
        const errEl = (k) => err[k] ? <div id={`bk-${k}-err`} className="fld-err">{err[k]}</div> : null;
        const reg = (k) => (el) => { fieldRefs.current[k] = el; };
        return(
          <Backdrop onClose={closeBooking}>
            <ModalBox>
              <div style={{height:170,position:"relative",overflow:"hidden"}}>
                <img src={coverPhoto(rm)} alt={`${name} — ${bedLabel(rm.beds)}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(26,15,8,.9) 0%,rgba(26,15,8,.55) 50%,rgba(26,15,8,.1) 100%)"}}/>
                <div style={{position:"absolute",bottom:"1.25rem",left:"1.75rem",right:"4rem"}}>
                  <div style={{color:C.gold,fontSize:".62rem",fontFamily:"'Lato',sans-serif",letterSpacing:".2em",textTransform:"uppercase"}}>{t("SOLICITAR RESERVA","REQUEST BOOKING")}</div>
                  <DialogHeading style={{color:C.ivory,fontSize:"1.35rem",fontWeight:500,marginTop:".18rem"}}>{name}</DialogHeading>
                </div>
                <button type="button" aria-label={t("Cerrar","Close")} onClick={closeBooking} style={{position:"absolute",top:".7rem",right:".7rem",background:"rgba(26,15,8,.6)",border:"none",color:"#fff",fontSize:"1.6rem",cursor:"pointer",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%"}}>×</button>
              </div>
              <form noValidate onSubmit={e=>{e.preventDefault();submitBooking();}} style={{padding:"1.4rem 1.75rem 1.5rem"}} className="modal-pad">
                <div role="group" aria-labelledby="bk-s1">
                  <h3 id="bk-s1" className="bk-sec-h">1 · {t("Fechas y huéspedes","Dates & guests")}</h3>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".85rem 1rem"}}>
                    <div style={{minWidth:0}}><FL htmlFor="bk-in">{t("Entrada","Check-in")} *</FL>
                      <input id="bk-in" ref={reg("checkIn")} className="inp" type="date" required min={today} max={addDays(today,MAX_ADVANCE_DAYS)} value={f.checkIn} onChange={e=>setBookDate("checkIn",e.target.value)} aria-invalid={!!err.checkIn} aria-describedby={errId("checkIn")}/>
                      {errEl("checkIn")}</div>
                    <div style={{minWidth:0}}><FL htmlFor="bk-out">{t("Salida","Check-out")} *</FL>
                      <input id="bk-out" ref={reg("checkOut")} className="inp" type="date" required min={isYmd(f.checkIn)?addDays(f.checkIn,1):addDays(today,1)} max={isYmd(f.checkIn)?addDays(f.checkIn,30):undefined} value={f.checkOut} onChange={e=>setBookDate("checkOut",e.target.value)} aria-invalid={!!err.checkOut} aria-describedby={errId("checkOut")}/>
                      {errEl("checkOut")}</div>
                    <div style={{minWidth:0}}><FL htmlFor="bk-guests">{t("Huéspedes","Guests")}</FL>
                      <select id="bk-guests" ref={reg("guests")} className="sel" value={f.guests} onChange={e=>setBookField("guests",parseInt(e.target.value,10))} aria-invalid={!!err.guests} aria-describedby={errId("guests")}>
                        {Array.from({length:cap},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} {n===1?t("persona","person"):t("personas","people")}</option>)}
                      </select>
                      {errEl("guests")}</div>
                  </div>
                  <div aria-live="polite" style={{marginTop:".9rem",fontFamily:"'Lato',sans-serif",fontSize:".82rem"}}>
                    {minNights>1&&<p style={{color:C.taupeText,marginBottom:".4rem"}}>{t(`Estadía mínima: ${minNights} noches.`,`Minimum stay: ${minNights} nights.`)}</p>}
                    {stayErr&&!err.checkIn&&!err.checkOut&&(stayErr.code==="min_nights"
                      ? <p style={{color:C.danger}}>{stayErrorText("min_nights",lang,stayErr.min)}</p>
                      : <p style={{color:C.taupeText}}>{t("Elige tus fechas para ver la disponibilidad y el precio.","Choose your dates to see availability and price.")}</p>)}
                    {st==="checking"&&<p style={{color:C.taupeText}}>{t("Verificando disponibilidad…","Checking availability…")}</p>}
                    {st==="available"&&<div className="success-banner">✓ {t("¡Disponible! La habitación está libre para esas fechas.","Available! The room is free for those dates.")}</div>}
                    {st==="unavailable"&&<div className="error-banner" style={{marginBottom:0}}>{isRoomClosed(rm)?t("Esta habitación no está disponible por ahora.","This room isn’t available right now."):t("Esta habitación no está disponible para esas fechas. Prueba otras fechas u otra habitación.","This room isn’t available for those dates. Try other dates or another room.")}{" "}<a href={waLink(t(`Hola, busco habitación del ${f.checkIn} al ${f.checkOut}.`,`Hi, I'm looking for a room from ${f.checkIn} to ${f.checkOut}.`))} target="_blank" rel="noopener noreferrer" style={{color:"#8E1B1B",fontWeight:700}}>{t("Pregúntanos por WhatsApp","Ask us on WhatsApp")}</a></div>}
                    {st==="error"&&<p style={{color:C.taupeText}}>{t("No pudimos verificar la disponibilidad ahora; la confirmaremos al recibir tu solicitud.","We couldn’t check availability right now; we’ll confirm it when we receive your request.")}</p>}
                  </div>
                  {q.valid&&!stayErr&&(
                    <div className="price-breakdown" data-testid="price-breakdown">
                      <div className="price-row">
                        <span style={{color:C.taupeText}}>
                          {q.seasonal
                            ? t(`${q.nights} ${nightsWord(q.nights)} (incluye tarifa de temporada)`,`${q.nights} ${nightsWord(q.nights)} (includes seasonal rate)`)
                            : <>{q.discounted&&<><s style={{color:C.taupeText}}><span className="sr-only">{t("Antes: ","Was: ")}</span>${q.baseRate}</s>{" "}</>}${q.rate} × {q.nights} {nightsWord(q.nights)}</>}
                        </span>
                        <span>{fmtMoney(q.subtotal)}</span>
                      </div>
                      {q.tax>0&&<div className="price-row"><span style={{color:C.taupeText}}>{t("Impuestos","Taxes")}</span><span>{fmtMoney(q.tax)}</span></div>}
                      <div className="price-row total"><span style={{color:C.ebony}}>{t("Total estimado","Estimated total")}</span><span data-testid="quote-total" style={{color:C.mahogany}}>{fmtMoney(q.total)}</span></div>
                      {q.savings>0&&<div style={{fontFamily:"'Lato',sans-serif",fontSize:".74rem",color:C.goldText,marginTop:".35rem"}}>{t(`Ahorras ${fmtMoney(q.savings)} reservando directo (−${q.discountPct}%).`,`You save ${fmtMoney(q.savings)} by booking direct (−${q.discountPct}%).`)}</div>}
                      <div style={{fontFamily:"'Lato',sans-serif",fontSize:".7rem",color:C.taupeText,marginTop:".4rem",fontStyle:"italic"}}>{t("*Sujeto a confirmación por WhatsApp","*Subject to confirmation via WhatsApp")}</div>
                    </div>
                  )}
                </div>

                {detailsOpen&&(<>
                  <div role="group" aria-labelledby="bk-s2" className="bk-sec">
                    <h3 id="bk-s2" className="bk-sec-h">2 · {t("Tus datos","Your details")}</h3>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".85rem 1rem"}} className="mob-full">
                      <div style={{gridColumn:"1/-1"}}><FL htmlFor="bk-name">{t("Nombre completo","Full name")} *</FL>
                        <input id="bk-name" ref={reg("name")} className="inp" autoComplete="name" maxLength={120} required value={f.name} onChange={e=>setBookField("name",e.target.value)} aria-invalid={!!err.name} aria-describedby={errId("name")}/>
                        {errEl("name")}</div>
                      <div style={{minWidth:0}}><FL htmlFor="bk-phone">{t("WhatsApp / Teléfono","WhatsApp / Phone")} *</FL>
                        <input id="bk-phone" ref={reg("phone")} className="inp" type="tel" inputMode="tel" autoComplete="tel" maxLength={40} required placeholder="+1 809 000 0000" value={f.phone} onChange={e=>setBookField("phone",e.target.value)} aria-invalid={!!err.phone} aria-describedby={errId("phone")}/>
                        {errEl("phone")}</div>
                      <div style={{minWidth:0}}><FL htmlFor="bk-email">{t("Email (opcional)","Email (optional)")}</FL>
                        <input id="bk-email" ref={reg("email")} className="inp" type="email" autoComplete="email" maxLength={254} value={f.email} onChange={e=>setBookField("email",e.target.value)} aria-invalid={!!err.email} aria-describedby={errId("email")||"bk-email-hint"}/>
                        {errEl("email")||<div id="bk-email-hint" style={{fontFamily:"'Lato',sans-serif",fontSize:".7rem",color:C.taupeText,marginTop:".3rem"}}>{t("Para recibir la confirmación por correo.","To get your confirmation by email.")}</div>}</div>
                    </div>
                  </div>

                  <div role="group" aria-labelledby="bk-s3" className="bk-sec">
                    <h3 id="bk-s3" className="bk-sec-h">3 · {t("Identificación","Identification")}</h3>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".85rem 1rem"}} className="mob-full">
                      <div style={{minWidth:0}}><FL htmlFor="bk-idtype">{t("Tipo de ID","ID type")} *</FL>
                        <select id="bk-idtype" className="sel" value={f.idType} onChange={e=>setBookField("idType",e.target.value)}><option value="cedula">{t("Cédula dominicana","Dominican cédula")}</option><option value="passport">{t("Pasaporte","Passport")}</option></select></div>
                      <div style={{minWidth:0}}><FL htmlFor="bk-idnum">{f.idType==='cedula'?t("Número de cédula","Cédula number"):t("Número de pasaporte","Passport number")} *</FL>
                        <input id="bk-idnum" ref={reg("idNumber")} className="inp" maxLength={40} required autoComplete="off" value={f.idNumber} placeholder={f.idType==='cedula'?"001-0000000-0":"AB123456"} onChange={e=>setBookField("idNumber",e.target.value)} aria-invalid={!!err.idNumber} aria-describedby={errId("idNumber")}/>
                        {errEl("idNumber")}</div>
                      <div style={{gridColumn:"1/-1"}}>
                        <span className="field-label" id="bk-photo-lbl">{t("Foto de cédula / pasaporte","Photo of ID / passport")} *</span>
                        <label className="id-drop" htmlFor="bk-photo" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:".4rem",padding:"1.1rem",border:`2px dashed ${err.idPhoto?C.danger:f.idPhotoData?C.olive:C.sand}`,borderRadius:8,background:f.idPhotoData?"#F1F8E9":C.smoke,cursor:"pointer",fontFamily:"'Lato',sans-serif",textAlign:"center"}}>
                          <input id="bk-photo" ref={reg("idPhoto")} type="file" accept="image/*" className="sr-only" aria-labelledby="bk-photo-lbl" aria-invalid={!!err.idPhoto} aria-describedby={errId("idPhoto")}
                            onChange={e=>{const file=e.target.files&&e.target.files[0]; e.target.value=""; onIdPhotoSelected(file);}}/>
                          {idPhotoBusy
                            ? <div style={{fontSize:".85rem",color:C.ebony}}>{t("Procesando foto…","Processing photo…")}</div>
                            : f.idPhotoData
                            ? <><img src={f.idPhotoData} alt={t("Vista previa de tu identificación","Preview of your ID")} style={{maxHeight:90,maxWidth:"100%",borderRadius:4}}/><div style={{fontSize:".78rem",fontWeight:700,color:"#4F5C40",overflowWrap:"anywhere"}}>✓ {f.idPhotoFile?.name||t("Foto lista","Photo ready")}</div><div style={{fontSize:".72rem",color:C.taupeText}}>{t("Toca para cambiarla","Tap to change it")}</div></>
                            : <><div aria-hidden="true" style={{fontSize:"1.6rem"}}>📷</div><div style={{fontSize:".85rem",fontWeight:700,color:C.ebony}}>{t("Subir una foto o tomarla","Upload or take a photo")}</div><div style={{fontSize:".72rem",color:C.taupeText}}>{t("Cédula o pasaporte (requerido)","ID or passport (required)")}</div></>}
                        </label>
                        {errEl("idPhoto")}
                      </div>
                    </div>
                  </div>

                  <div role="group" aria-labelledby="bk-s4" className="bk-sec">
                    <h3 id="bk-s4" className="bk-sec-h">4 · {t("Confirmar","Confirm")}</h3>
                    <FL htmlFor="bk-notes">{t("Notas / solicitudes especiales","Notes / special requests")}</FL>
                    <textarea id="bk-notes" className="inp" maxLength={2000} value={f.notes} onChange={e=>setBookField("notes",e.target.value)} style={{height:60,resize:"vertical",marginBottom:"1rem"}}/>
                    <div style={{marginBottom:".9rem"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:".6rem",fontFamily:"'Lato',sans-serif",fontSize:".8rem",color:C.ebony}}>
                        <input id="bk-privacy" ref={reg("privacy")} type="checkbox" checked={!!f.privacyAccepted} onChange={e=>setBookField("privacyAccepted",e.target.checked)} aria-invalid={!!err.privacy} aria-describedby={errId("privacy")} style={{marginTop:".15rem",width:20,height:20,accentColor:C.goldText,flexShrink:0}}/>
                        <span><label htmlFor="bk-privacy" style={{cursor:"pointer"}}>{t("Acepto la","I accept the")}</label> <button type="button" onClick={()=>setShowPrivacy(true)} style={{background:"none",border:"none",color:C.goldText,textDecoration:"underline",cursor:"pointer",padding:0,fontFamily:"inherit",fontSize:"inherit"}}>{t("Política de Privacidad","Privacy Policy")}</button></span>
                      </div>
                      {errEl("privacy")}
                    </div>
                    {bookError&&<div ref={bookErrorRef} tabIndex={-1} role="alert" className="error-banner" style={{outline:"none"}}>{bookError}</div>}
                    <button type="submit" className="btn-gold" style={{width:"100%",marginTop:".25rem"}} disabled={submitting||idPhotoBusy||st==="unavailable"||st==="checking"} aria-busy={submitting}>
                      {submitting?t("ENVIANDO…","SENDING…"):t("ENVIAR SOLICITUD","SUBMIT REQUEST")}
                    </button>
                    <p style={{fontFamily:"'Lato',sans-serif",fontSize:".72rem",color:C.taupeText,textAlign:"center",marginTop:".85rem",lineHeight:1.7}}>
                      <span aria-hidden="true">💳</span> {t("Pago: efectivo o transferencia al llegar","Payment: cash or transfer on arrival")}<br/>
                      <span aria-hidden="true">↩️</span> {t("Cancelación gratuita con 48h de anticipación","Free cancellation with 48h notice")}
                    </p>
                  </div>
                </>)}
              </form>
            </ModalBox>
          </Backdrop>
        );
      })()}

      {/* Gallery lightbox */}
      {galOpen!==null&&galItems[galOpen]&&(()=>{
        const n = galItems.length;
        const g = galItems[galOpen];
        const label = galLabel(g);
        const go = (d) => setGalOpen((galOpen+d+n)%n);
        return(
          <Backdrop onClose={()=>setGalOpen(null)} label={t(`Galería: ${label}`,`Gallery: ${label}`)}
            onKeyDown={e=>{if(e.key==="ArrowLeft"){e.preventDefault();go(-1);}else if(e.key==="ArrowRight"){e.preventDefault();go(1);}}}
            style={{background:"rgba(26,15,8,.97)",flexDirection:"column",zIndex:3000,backdropFilter:"none",WebkitBackdropFilter:"none"}}>
            <div style={{position:"relative",maxWidth:950,width:"95%"}}>
              <div style={{position:"relative",maxHeight:"70vh",overflow:"hidden"}}>
                <img src={g.photo} alt={label} style={{width:"100%",maxHeight:"70vh",objectFit:"contain",display:"block"}}/>
                <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(26,15,8,.75))",padding:"2rem 1.5rem 1.25rem"}}>
                  <div style={{color:C.goldLight,fontSize:"1.1rem",fontWeight:300}}>{label}</div>
                  <div style={{color:C.taupe,fontFamily:"'Lato',sans-serif",fontSize:".68rem",letterSpacing:".15em",textTransform:"uppercase",marginTop:".18rem"}}>Caonabo 35 · {galOpen+1}/{n}</div>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:".85rem",gap:".5rem"}}>
                <button type="button" className="btn-out" style={{padding:".55rem 1.1rem",minHeight:44,flexShrink:0}} onClick={()=>go(-1)}>← {t("Anterior","Previous")}</button>
                <div className="gal-dots">
                  {galItems.map((_,i)=><button key={i} type="button" className="gal-dot" aria-label={t(`Foto ${i+1} de ${n}`,`Photo ${i+1} of ${n}`)} aria-current={i===galOpen?"true":undefined} onClick={()=>setGalOpen(i)}><span style={{background:i===galOpen?C.gold:"#8B6B4E"}}/></button>)}
                </div>
                <button type="button" className="btn-out" style={{padding:".55rem 1.1rem",minHeight:44,flexShrink:0}} onClick={()=>go(1)}>{t("Siguiente","Next")} →</button>
              </div>
            </div>
            <button type="button" aria-label={t("Cerrar","Close")} onClick={()=>setGalOpen(null)} style={{position:"fixed",top:"1rem",right:"1rem",background:"rgba(42,31,22,.7)",border:`1px solid ${C.mahogany}`,color:C.parchment,fontSize:"1.5rem",cursor:"pointer",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%"}}>×</button>
          </Backdrop>
        );
      })()}

      {/* Room photo lightbox */}
      {roomLightbox!==null&&(()=>{
        const gallery=roomLightbox.photos||[];
        const photos=gallery.map(g=>g.url);
        const labels=gallery.map(g=>photoLabel(g.label));
        const idx=roomLightbox.idx||0;
        const n=photos.length;
        const go=(d)=>setRoomLightbox({...roomLightbox,idx:(idx+d+n)%n});
        return(
          <Backdrop onClose={()=>setRoomLightbox(null)} label={`${roomLightbox.name} — ${t("fotos","photos")}`}
            onKeyDown={e=>{if(n<2)return;if(e.key==="ArrowLeft"){e.preventDefault();go(-1);}else if(e.key==="ArrowRight"){e.preventDefault();go(1);}}}
            style={{background:"rgba(26,15,8,.97)",flexDirection:"column",zIndex:3000,backdropFilter:"none",WebkitBackdropFilter:"none"}}>
            <div style={{position:"relative",maxWidth:950,width:"95%"}}>
              <div style={{position:"relative",maxHeight:"70vh",overflow:"hidden"}}>
                <img src={photos[idx]} alt={`${roomLightbox.name} — ${labels[idx]}`} style={{width:"100%",maxHeight:"70vh",objectFit:"contain",display:"block"}}/>
                <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(26,15,8,.75))",padding:"2rem 1.5rem 1.25rem"}}>
                  <div style={{color:C.goldLight,fontSize:"1.1rem",fontWeight:300}}>{roomLightbox.name} — {labels[idx]}</div>
                  <div style={{color:C.taupe,fontFamily:"'Lato',sans-serif",fontSize:".68rem",letterSpacing:".15em",textTransform:"uppercase",marginTop:".18rem"}}>Caonabo 35 · {idx+1}/{n}</div>
                </div>
              </div>
              {n>1&&(<>
                <button type="button" aria-label={t("Foto anterior","Previous photo")} onClick={()=>go(-1)} style={lightboxArrow("left")}>‹</button>
                <button type="button" aria-label={t("Foto siguiente","Next photo")} onClick={()=>go(1)} style={lightboxArrow("right")}>›</button>
                <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:".4rem",marginTop:".85rem",flexWrap:"wrap",maxHeight:110,overflowY:"auto"}}>
                  {photos.map((src,i)=>(
                    <button key={i} type="button" aria-label={labels[i]} aria-current={i===idx?"true":undefined} onClick={()=>setRoomLightbox({...roomLightbox,idx:i})}
                      style={{width:62,height:44,padding:0,border:`2px solid ${i===idx?C.gold:"transparent"}`,
                              opacity:i===idx?1:0.55,background:"none",cursor:"pointer",flex:"0 0 auto"}}>
                      <img src={src} alt="" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                    </button>
                  ))}
                </div>
              </>)}
            </div>
            <button type="button" aria-label={t("Cerrar","Close")} onClick={()=>setRoomLightbox(null)} style={{position:"fixed",top:"1rem",right:"1rem",background:"rgba(42,31,22,.7)",border:`1px solid ${C.mahogany}`,color:C.parchment,fontSize:"1.5rem",cursor:"pointer",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%"}}>×</button>
          </Backdrop>
        );
      })()}

      {/* Amenity modal */}
      {amenModal&&(
        <Backdrop onClose={()=>setAmenModal(null)}>
          <ModalBox width={560}>
            <div style={{height:240,position:"relative",overflow:"hidden"}}>
              <img src={amenModal.photo} alt={lang==="es"?amenModal.name:amenModal.nameEn} decoding="async" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(transparent 35%,rgba(26,15,8,.85))"}}/>
              <div style={{position:"absolute",bottom:"1.6rem",left:"2rem",right:"4rem"}}>
                <DialogHeading style={{color:C.ivory,fontSize:"1.75rem",fontWeight:400}}>{lang==="es"?amenModal.name:amenModal.nameEn}</DialogHeading>
              </div>
              <button type="button" aria-label={t("Cerrar","Close")} onClick={()=>setAmenModal(null)} style={{position:"absolute",top:".7rem",right:".7rem",background:"rgba(26,15,8,.6)",border:"none",color:"#fff",fontSize:"1.5rem",cursor:"pointer",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%"}}>×</button>
            </div>
            <div style={{padding:"1.75rem 2rem"}} className="modal-pad">
              <p style={{color:C.ebony,lineHeight:1.85,fontSize:".97rem",marginBottom:"1.6rem"}}>{lang==="es"?amenModal.desc:amenModal.descEn}</p>
              <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
                <button type="button" className="btn-gold" onClick={()=>{setAmenModal(null);setTimeout(()=>document.getElementById("rooms")?.scrollIntoView({behavior:"smooth"}),0);}}>{t("VER HABITACIONES","VIEW ROOMS")}</button>
                <button type="button" className="btn-out lt" onClick={()=>setAmenModal(null)}>{t("CERRAR","CLOSE")}</button>
              </div>
            </div>
          </ModalBox>
        </Backdrop>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacy&&(
        <Backdrop onClose={()=>setShowPrivacy(false)}>
          <ModalBox>
            <ModalHdr title={t("Política de Privacidad","Privacy Policy")} sub="CAONABO 35" onClose={()=>setShowPrivacy(false)} closeLabel={t("Cerrar","Close")}/>
            <div className="modal-pad" style={{padding:"1.25rem 2rem 1.75rem",fontFamily:"'Lato',sans-serif",fontSize:".82rem",color:C.ebony,whiteSpace:"pre-wrap",lineHeight:1.7}}>
              {lang==="es"?PRIVACY_POLICY_ES:PRIVACY_POLICY_EN}
            </div>
          </ModalBox>
        </Backdrop>
      )}

      {/* Guest Portal Modal ("Mi Reserva") */}
      {guestPortalOpen&&(
        <Backdrop onClose={closeGuestPortal}>
          <ModalBox>
            <ModalHdr title={t("Mi Reserva","My Booking")} sub={t("CONSULTA TU RESERVA","VIEW YOUR BOOKING")} onClose={closeGuestPortal} closeLabel={t("Cerrar","Close")}/>
            <div style={{padding:"1.5rem 2rem"}} className="modal-pad">
            {!guestBooking?(
              <form noValidate onSubmit={e=>{e.preventDefault();lookupGuestBooking();}}>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".84rem",color:C.taupeText,marginBottom:"1.25rem"}}>{t("Ingresa el email y el teléfono que usaste al hacer tu reserva.","Enter the email and phone number you used when booking.")}</p>
                {guestLookupError&&<div className="error-banner" role="alert" style={{marginBottom:"1rem"}}>{guestLookupError}</div>}
                <div style={{marginBottom:".9rem"}}><FL htmlFor="gl-email">{t("Email de tu reserva","Booking email")}</FL><Inp id="gl-email" type="email" autoComplete="email" value={guestLookup.email||""} onChange={e=>setGuestLookup(p=>({...p,email:e.target.value}))} placeholder={t("tu@email.com","you@email.com")}/></div>
                <div style={{marginBottom:"1.25rem"}}><FL htmlFor="gl-phone">{t("Teléfono de tu reserva","Booking phone")}</FL><Inp id="gl-phone" type="tel" autoComplete="tel" value={guestLookup.phone||""} onChange={e=>setGuestLookup(p=>({...p,phone:e.target.value}))} placeholder="+1 809 000 0000"/></div>
                <button type="submit" className="btn-gold" style={{width:"100%"}} disabled={guestLookupLoading} aria-busy={guestLookupLoading}>{guestLookupLoading?t("Buscando...","Searching..."):t("BUSCAR RESERVA","FIND BOOKING")}</button>
              </form>
            ):(()=>{
              const gb = guestBooking;
              const statusTxt = STATUS_LABELS[gb.status] ? STATUS_LABELS[gb.status][L] : String(gb.status||"");
              const tone = gb.status==="cancelled" ? {bg:C.dangerBg,fg:C.danger} : gb.status==="pending" ? {bg:"#FFF8E1",fg:"#9A3D00"} : {bg:"#F1F8E9",fg:"#2E7D32"};
              const total = Number(gb.total);
              const room = rooms.find(r=>String(r.id)===String(gb.room));
              return(
              <div>
                <div role="status" style={{padding:"1rem",background:tone.bg,borderLeft:`3px solid ${tone.fg}`,marginBottom:"1.25rem",fontFamily:"'Lato',sans-serif"}}>
                  <div style={{fontSize:".62rem",color:C.taupeText,textTransform:"uppercase",letterSpacing:".12em",marginBottom:".4rem"}}>{t("Estado","Status")}</div>
                  <div style={{fontWeight:700,color:tone.fg,fontSize:"1rem"}}>{statusTxt}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".85rem",fontFamily:"'Lato',sans-serif",marginBottom:"1.25rem"}}>
                  {[[t("Reserva #","Booking #"),gb.id],[t("Huésped","Guest"),gb.guest],[t("Habitación","Room"),room?roomName(room):gb.room],[t("Entrada","Check-in"),gb.check_in],[t("Salida","Check-out"),gb.check_out],[t("Noches","Nights"),gb.nights],[t("Huéspedes","Guests"),gb.guests],[t("Total","Total"),gb.total!=null&&gb.total!==""&&Number.isFinite(total)?fmtMoney(total):"—"],[t("Pago","Payment"),gb.paid?t("✓ Pagado","✓ Paid"):t("Pendiente","Pending")]].map(([l,v])=>(
                    <div key={l}><div style={{fontSize:".6rem",color:C.taupeText,textTransform:"uppercase",letterSpacing:".1em",marginBottom:".2rem"}}>{l}</div><div style={{fontWeight:700,color:C.ebony,fontSize:".85rem",overflowWrap:"anywhere"}}>{v}</div></div>
                  ))}
                </div>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".78rem",color:C.taupeText,textAlign:"center",marginBottom:".75rem"}}>{t("¿Necesitas ayuda? Escríbenos por WhatsApp.","Need help? Message us on WhatsApp.")}</p>
                <a className="btn-gold" style={{width:"100%"}} href={waLink()} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">💬</span> WhatsApp</a>
              </div>
              );
            })()}
            </div>
          </ModalBox>
        </Backdrop>
      )}

    </div>
  );
} // end App
