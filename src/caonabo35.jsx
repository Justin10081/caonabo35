import { useState, useRef, useEffect } from "react";
import { supabase } from "./lib/supabase.js";
import MultiCalendar from "./MultiCalendar.jsx";

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

const GALLERY = [
  {photo:I.terrace,label:"Terraza Exterior",tag:"outdoor",featured:true},
  {photo:I.livingBig,label:"Sala Principal",tag:"living",featured:true},
  {photo:I.artBench,label:"Arte & Galería",tag:"detail",featured:false},
  {photo:I.livingWide,label:"Sala Panorámica",tag:"living",featured:true},
  {photo:I.mirror,label:"Espejo de Diseño",tag:"detail",featured:false},
  {photo:I.reception,label:"Recepción",tag:"common",featured:true},
  {photo:I.corridor,label:"Corredor Verde",tag:"outdoor",featured:true},
  {photo:I.tvRoom,label:"Sala de Estar",tag:"living",featured:false},
  {photo:I.amberChairs,label:"Lounge Ámbar",tag:"common",featured:false},
  {photo:I.bathroom,label:"Baño en Mármol",tag:"bathroom",featured:true},
  {photo:I.facade,label:"Fachada Caonabo 35",tag:"exterior",featured:true},
  {photo:I.rainShower,label:"Rain Shower",tag:"bathroom",featured:true},
  {photo:I.plants,label:"Jardín Interior",tag:"outdoor",featured:false},
  {photo:I.chessRoom,label:"Zona de Juegos",tag:"living",featured:false},
];

const AMENITIES = [
  {cat:"Espacios",name:"Terraza Privada",nameEn:"Private Terrace",photo:I.terrace,desc:"Terraza exterior con mobiliario de teca, iluminación de cuerda y vistas abiertas a la ciudad. Perfecta al anochecer."},
  {cat:"Espacios",name:"Jardín Interior",nameEn:"Indoor Garden",photo:I.plants,desc:"Vegetación tropical seleccionada: bambú, ficus y pothos en macetas de cemento artesanal."},
  {cat:"Espacios",name:"Lobby de Arte",nameEn:"Art Lobby",photo:I.lobby,desc:"Recepción con piezas de arte contemporáneo dominicano, consola de mármol e iluminación arquitectónica."},
  {cat:"Servicios",name:"Concierge 24/7",nameEn:"24/7 Concierge",photo:I.reception,desc:"Equipo disponible para traslados, reservas de restaurantes y actividades locales."},
  {cat:"Servicios",name:"Estacionamiento",nameEn:"Private Parking",photo:I.facade,desc:"Estacionamiento privado y vigilado para todos los huéspedes, sin costo adicional."},
  {cat:"Servicios",name:"WiFi Fibra Óptica",nameEn:"Fiber Optic WiFi",photo:I.corridor,desc:"Conexión de fibra óptica simétrica de alta velocidad en todo el edificio."},
];

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

// ─── Helpers ──────────────────────────────────────────────────────────
const TAX_RATE = 0;
const nights = (cin,cout) => Math.max(1,Math.round((new Date(cout)-new Date(cin))/86400000));
function compressImage(file,maxW=700,maxH=900,quality=0.75){
  return new Promise(resolve=>{
    const reader=new FileReader();
    reader.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        let w=img.width,h=img.height;
        const ratio=Math.min(maxW/w,maxH/h,1);
        w=Math.round(w*ratio); h=Math.round(h*ratio);
        const canvas=document.createElement('canvas');
        canvas.width=w; canvas.height=h;
        canvas.getContext('2d').drawImage(img,0,0,w,h);
        resolve(canvas.toDataURL('image/jpeg',quality));
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
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

// Same idea as compressImage but yields a Blob for direct upload to Storage,
// and at a larger size — these are the hero photos on the public site, not a
// thumbnail. A modern phone photo (4-8 MB) lands around 200-400 KB here.
function compressToBlob(file,maxW=1600,maxH=1200,quality=0.82){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('read failed'));
    reader.onload=e=>{
      const img=new Image();
      img.onerror=()=>reject(new Error('not an image'));
      img.onload=()=>{
        let w=img.width,h=img.height;
        const ratio=Math.min(maxW/w,maxH/h,1);
        w=Math.round(w*ratio); h=Math.round(h*ratio);
        const canvas=document.createElement('canvas');
        canvas.width=w; canvas.height=h;
        canvas.getContext('2d').drawImage(img,0,0,w,h);
        canvas.toBlob(b=>b?resolve(b):reject(new Error('encode failed')),'image/jpeg',quality);
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const fmtMoney = (n) => "$" + Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' }); // real current date (was hardcoded to 2026-03-26)
const ROOM_COLORS = ["#8B6B4E","#5C3D2E","#6B7A5A","#C4973A","#1565C0","#7B1FA2","#C62828"];
const MONTH_NAMES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTH_NAMES_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_IN_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31];
const isLeap = y => (y%4===0&&y%100!==0)||y%400===0;
const daysInMonth = (m,y) => m===1&&isLeap(y)?29:DAYS_IN_MONTH[m];
const firstWeekday = (m,y) => new Date(y,m,1).getDay();
const fmtDate = (y,m,d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

// ─── Conflict check ───────────────────────────────────────────────────
function hasConflict(bookings, roomId, checkIn, checkOut, excludeId=null) {
  return bookings.some(b => {
    if(b.id===excludeId) return false;
    if(b.room!==roomId) return false;
    if(b.status==="cancelled") return false;
    // overlaps if new checkin < existing checkout AND new checkout > existing checkin
    return checkIn < b.checkOut && checkOut > b.checkIn;
  });
}

// True if any night in [checkIn, checkOut) is blocked by an imported OTA (Airbnb/Booking) calendar.
// blockSet holds `${roomId}|${YYYY-MM-DD}` keys loaded from channel_blocks.
function channelConflict(blockSet, roomId, checkIn, checkOut) {
  if(!blockSet || !blockSet.size || !checkIn || !checkOut) return false;
  const pad=n=>String(n).padStart(2,'0');
  const d=new Date(checkIn+"T00:00:00"), stop=new Date(checkOut+"T00:00:00");
  let g=0;
  while(d<stop && g++<800){
    const ymd=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    if(blockSet.has(`${String(roomId)}|${ymd}`)) return true;
    d.setDate(d.getDate()+1);
  }
  return false;
}

// ─── Price breakdown helper ───────────────────────────────────────────
// Returns the effective nightly rate for one date, honoring (1) explicit date-range temporary
// rates (his dad's "set a price for these dates" — auto-expires because a past range can't match
// a future night), then (2) legacy recurring month/day % seasons, else the base price.
function nightlyRate(roomPrice, ymd, mmdd, seasons, roomId) {
  const ranges = (seasons||[]).filter(s => s && s.type==='range' && s.start && s.end
    && ymd >= s.start && ymd <= s.end
    && (!s.room || s.room==='all' || String(s.room)===String(roomId)));
  if(ranges.length) {
    const specific = ranges.filter(s => s.room && s.room!=='all');   // a room-specific rule beats an "all rooms" rule
    const pool = specific.length ? specific : ranges;
    const rateOf = s => s.mode==='pct' ? Math.round(roomPrice*(1+(s.pct||0)/100)) : (Number(s.price)||roomPrice);
    const pick = pool.reduce((a,b)=> rateOf(b) > rateOf(a) ? b : a);
    return { rate: rateOf(pick), pct: pick.mode==='pct' ? (pick.pct||0) : 0, seasonal: true };
  }
  let pct = 0;
  (seasons||[]).forEach(s => {
    if(!s || s.type==='range') return;
    const sMD = parseInt(s.startMonth)*100 + parseInt(s.startDay);
    const eMD = parseInt(s.endMonth)*100 + parseInt(s.endDay);
    const inS = sMD<=eMD ? (mmdd>=sMD && mmdd<=eMD) : (mmdd>=sMD || mmdd<=eMD);  // wraps year-end when start>end
    if(inS) pct = Math.max(pct, s.pct||0);
  });
  if(pct>0) return { rate: Math.round(roomPrice*(1+pct/100)), pct, seasonal: true };
  return { rate: roomPrice, pct: 0, seasonal: false };
}

// ─── Price breakdown helper (per-night, so partial-season stays are priced correctly) ───
function calcPrice(roomPrice, checkIn, checkOut, discount, seasons=[], roomId=null) {
  const n = nights(checkIn, checkOut);
  const pad = x => String(x).padStart(2,'0');
  let subtotal = 0, maxPct = 0, seasonalApplied = false;
  if(checkIn && checkOut && n > 0) {
    const start = new Date(checkIn+"T00:00:00");
    for(let i=0;i<n;i++){
      const d = new Date(start); d.setDate(d.getDate()+i);
      const ymd = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      const mmdd = (d.getMonth()+1)*100 + d.getDate();
      const nr = nightlyRate(roomPrice, ymd, mmdd, seasons, roomId);
      subtotal += nr.rate;
      if(nr.seasonal){ seasonalApplied = true; maxPct = Math.max(maxPct, nr.pct); }
    }
  } else {
    subtotal = roomPrice * n;
  }
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  let total = subtotal + tax;
  let discountAmt = 0;
  if(discount) {
    discountAmt = discount.type==='percent'
      ? Math.round(total * discount.amount) / 100
      : Math.min(discount.amount, total);
    total = Math.max(0, total - discountAmt);
  }
  return { nights: n, subtotal, tax, total, discountAmt, seasonalPct: maxPct, seasonal: seasonalApplied };
}

// ─── CSS ──────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Lato:wght@300;400;600;700;900&display=swap');
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
.nav-lnk{font-family:'Lato',sans-serif;font-size:.71rem;letter-spacing:.15em;text-transform:uppercase;cursor:pointer;padding:.3rem 0;border-bottom:1px solid transparent;transition:all .2s;color:#B8A898}
.nav-lnk:hover{color:#C4973A;border-bottom-color:#C4973A}
.room-card{background:#fff;overflow:hidden;transition:transform .3s,box-shadow .3s;box-shadow:0 2px 20px rgba(42,31,22,.07)}
.room-card:hover{transform:translateY(-5px);box-shadow:0 16px 48px rgba(42,31,22,.16)}
.room-card:hover .rm-ovr{opacity:1!important}
.gal-item{overflow:hidden;cursor:pointer;position:relative}
.gal-item img{width:100%;height:100%;object-fit:cover;transition:transform .4s}
.gal-item:hover img{transform:scale(1.06)}
.gal-item:hover .gal-cap{opacity:1!important}
.am-row{display:flex;align-items:center;gap:1.5rem;padding:1.2rem 1.75rem;background:#fff;border-bottom:1px solid #EDE6D9;cursor:pointer;transition:background .18s}
.am-row:last-child{border-bottom:none}.am-row:hover{background:#F7F3EE}
.am-row:hover .am-arr{opacity:1!important;transform:translateX(4px)!important}
.sb{display:block;padding:.75rem 1.4rem;font-family:'Lato',sans-serif;font-size:.76rem;letter-spacing:.07em;cursor:pointer;border-left:2px solid transparent;transition:all .16s;color:#D4C5B0;white-space:nowrap}
.sb:hover,.sb.act{color:#C4973A;border-left-color:#C4973A;background:rgba(196,151,58,.07)}
.tr{transition:background .12s ease}.tr:hover{background:#EDE6D9!important;cursor:pointer}
.inp{width:100%;padding:.7rem 1rem;border:1px solid #D4C5B0;font-size:.88rem;font-family:'Lato',sans-serif;background:#F0EDE8;outline:none;transition:border-color .15s ease,box-shadow .15s ease;color:#2A1F16}
.inp:focus{border-color:#C4973A;box-shadow:0 0 0 3px rgba(196,151,58,.15)}
.inp.error{border-color:#c62828;background:#fff5f5}
.sel{width:100%;padding:.7rem 1rem;border:1px solid #D4C5B0;font-size:.88rem;font-family:'Lato',sans-serif;background:#F0EDE8;color:#2A1F16;transition:border-color .15s ease,box-shadow .15s ease;outline:none}
.sel:focus{border-color:#C4973A;box-shadow:0 0 0 3px rgba(196,151,58,.15)}
.tog{padding:.42rem 1rem;font-family:'Lato',sans-serif;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;border:1px solid rgba(196,151,58,.35);background:transparent;color:#B8A898;transition:all .15s ease}
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
*:focus-visible{outline:2px solid #C4973A;outline-offset:2px}
::-webkit-scrollbar{width:7px;height:7px}::-webkit-scrollbar-track{background:#F0EDE8}::-webkit-scrollbar-thumb{background:#C4973A;border-radius:4px}::-webkit-scrollbar-thumb:hover{background:#E8C97A}
@media(max-width:768px){
  .mob-hide{display:none!important}
  .mob-full{grid-template-columns:1fr!important}
  .mob-stack{flex-direction:column!important}
  .mob-p{padding:1rem!important}
  .mob-tabbar{display:block!important}
  .mob-pb{padding-bottom:80px!important}
  .mob-2col{grid-template-columns:repeat(2,1fr)!important}
  .mob-wrap{flex-wrap:wrap!important}
}
`;

// ─── Primitives ───────────────────────────────────────────────────────
const FL = ({children}) => <label className="field-label">{children}</label>;
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
const SHead = ({eyebrow,title,dark,left}) => (
  <div style={{textAlign:left?"left":"center",marginBottom:"3rem"}}>
    <p style={{color:"#C4973A",fontSize:".65rem",fontFamily:"'Lato',sans-serif",letterSpacing:".32em",textTransform:"uppercase",marginBottom:".45rem"}}>{eyebrow}</p>
    <h2 style={{fontSize:"clamp(1.85rem,3.8vw,2.85rem)",fontWeight:300,color:dark?"#F7F3EE":"#2A1F16",letterSpacing:".04em"}}>{title}</h2>
    <div style={{width:44,height:1,background:"#C4973A",margin:left?".9rem 0":"1rem auto"}}/>
  </div>
);
const Backdrop = ({onClose,children}) => (
  <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
    style={{position:"fixed",inset:0,background:"rgba(26,15,8,.82)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,padding:"1rem",overflowY:"auto"}}>
    {children}
  </div>
);
const ModalBox = ({children,width=580}) => (
  <div className="scalein" style={{background:"#fff",width:"100%",maxWidth:width,maxHeight:"92vh",overflowY:"auto"}}>{children}</div>
);
const ModalHdr = ({title,sub,onClose}) => (
  <div style={{padding:"1.6rem 2rem",borderBottom:"1px solid #EDE6D9",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
    <div>
      {sub&&<div style={{color:"#C4973A",fontSize:".62rem",fontFamily:"'Lato',sans-serif",letterSpacing:".2em",textTransform:"uppercase",marginBottom:".2rem"}}>{sub}</div>}
      <div style={{fontSize:"1.3rem",fontWeight:500,color:"#2A1F16"}}>{title}</div>
    </div>
    <button onClick={onClose} style={{background:"none",border:"none",fontSize:"1.8rem",cursor:"pointer",color:"#B8A898",lineHeight:1,marginLeft:"1rem",padding:"0 .25rem"}}>×</button>
  </div>
);

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
  return(
    <div style={{fontFamily:"'Cormorant Garamond',serif",minHeight:"100vh",background:"#F7F3EE",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
      <style>{css}</style>
      <div className="scalein" style={{background:"#fff",maxWidth:560,width:"100%",textAlign:"center",overflow:"hidden"}}>
        <div style={{background:"#2A1F16",padding:"2.5rem 2rem"}}>
          <div style={{width:60,height:60,borderRadius:"50%",background:"#C4973A",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem",fontSize:"1.8rem"}}>✓</div>
          <div style={{color:"#C4973A",fontSize:".65rem",fontFamily:"'Lato',sans-serif",letterSpacing:".3em",textTransform:"uppercase",marginBottom:".5rem"}}>{t("SOLICITUD ENVIADA","REQUEST SENT")}</div>
          <h1 style={{color:"#F7F3EE",fontSize:"1.8rem",fontWeight:300,letterSpacing:".06em"}}>
            {t("¡Gracias,","Thank you,")} {booking.name}!
          </h1>
        </div>
        <div style={{padding:"2rem"}}>
          <p style={{fontFamily:"'Lato',sans-serif",fontSize:".88rem",color:"#8B6B4E",lineHeight:1.7,marginBottom:"1rem"}}>
            {t(
              `Tu solicitud para ${room?.name} ha sido recibida. Te contactaremos al correo ${booking.email} para confirmar tu reserva.`,
              `Your request for ${room?.nameEn} has been received. We will contact you at ${booking.email} to confirm your booking.`
            )}
          </p>
          <div style={{background:"#F7F3EE",padding:"1.25rem",marginBottom:"1.5rem",textAlign:"left"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",fontFamily:"'Lato',sans-serif",fontSize:".8rem"}}>
              {[[t("Habitación","Room"),lang==="es"?room?.name:room?.nameEn],[t("Entrada","Check-in"),booking.checkIn],[t("Salida","Check-out"),booking.checkOut],[t("Noches","Nights"),n],[t("Huéspedes","Guests"),booking.guests],[t("Total estimado","Estimated total"),fmtMoney(booking.total)]].map(([l,v])=>(
                <div key={l}><div style={{color:"#C4973A",fontSize:".6rem",letterSpacing:".15em",textTransform:"uppercase",marginBottom:".15rem"}}>{l}</div><div style={{fontWeight:700,color:"#2A1F16"}}>{v}</div></div>
              ))}
            </div>
          </div>
          <p style={{fontFamily:"'Lato',sans-serif",fontSize:".78rem",color:"#B8A898",marginBottom:"1.5rem",fontStyle:"italic"}}>
            {t("*Precios sujetos a confirmación.","*Prices subject to confirmation.")}
          </p>
          {(()=>{
            const dep=Math.max(20,Math.round(booking.total*0.30));
            return(
              <div style={{background:"#2A1F16",padding:"1.25rem 1.5rem",marginBottom:"1.5rem",borderRadius:4,textAlign:"left"}}>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".7rem",color:"#C4973A",letterSpacing:".2em",textTransform:"uppercase",marginBottom:".4rem"}}>💳 Confirma tu reserva ahora</p>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".82rem",color:"#B8A898",marginBottom:"1rem",lineHeight:1.5}}>{"Paga un depósito del 30% ($"+dep+") y tu habitación queda confirmada inmediatamente — sin esperar."}</p>
                <PayPalDepositButton bookingId={booking.id} depositAmount={dep} roomName={room?(lang==="es"?room.name:room.nameEn):"Habitación"} nights={booking.nights} onSuccess={onPaymentSuccess}/>
              </div>
            );
          })()}
          <div style={{display:"flex",gap:"1rem",justifyContent:"center",flexWrap:"wrap"}}>
            <button className="btn-gold" onClick={onClose}>{t("VOLVER AL INICIO","BACK TO HOME")}</button>
            <a href={`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(t(`Hola! Acabo de hacer una reserva para ${room?.name} del ${booking.checkIn} al ${booking.checkOut}. Nombre: ${booking.name}`,`Hi! I just made a booking for ${room?.nameEn} from ${booking.checkIn} to ${booking.checkOut}. Name: ${booking.name}`))}`} style={{textDecoration:"none"}} target="_blank" rel="noopener">
              <button className="btn-out">{t("¿PREGUNTAS? WHATSAPP","QUESTIONS? WHATSAPP")}</button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── MAIN APP ─────────────────────────────────────────────────────────
export default function App() {
  const [view,setView] = useState(()=>sessionStorage.getItem('c35_view')||"public");
  const [lang,setLang] = useState("es");
  const [adminAuth,setAdminAuth] = useState(false);
  const [adminEmail,setAdminEmail] = useState("");
  const [authLoading,setAuthLoading] = useState(false);
  const [adminPwd,setAdminPwd] = useState("");
  const [pwdError,setPwdError] = useState("");
  const [adminTab,setAdminTab] = useState(()=>{ try{return sessionStorage.getItem('c35_tab')||"dashboard";}catch{return "dashboard";} });
  useEffect(()=>{ try{sessionStorage.setItem('c35_tab',adminTab);}catch{} },[adminTab]);
  const [calView,setCalView] = useState("mes");       // unified Calendario hub: "mes" (month grid) | "precios" (per-night grid)
  const [resSearch,setResSearch] = useState("");        // search across ALL reservations from the Calendario hub
  const [gridVersion,setGridVersion] = useState(0);   // bumped on room_nights realtime change → forces the price grid to reload live
  const [channelBlocks,setChannelBlocks] = useState(()=>new Set());  // `${roomId}|YYYY-MM-DD` imported from Airbnb/Booking iCal
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
  const [roomAvail,setRoomAvail] = useState({}); // manual availability overrides per room
  const [reviews,setReviews] = useState(REVIEWS_INIT);   // sample testimonials — kept as public filler until real ones accumulate
  const [dbReviews,setDbReviews] = useState([]);          // real, verified guest reviews from the DB
  const [reviewParam,setReviewParam] = useState(()=>{ try{return new URLSearchParams(window.location.search).get('rev');}catch{return null;} });
  const [reviewForm,setReviewForm] = useState({rating:5,body:"",done:false,err:""});
  const [settings,setSettings] = useState(SETTINGS_INIT);

  // Public UI
  const [selRoom,setSelRoom] = useState(null);
  const [bookModal,setBookModal] = useState(false);
  const [bookForm,setBookForm] = useState({name:"",email:"",phone:"",checkIn:"",checkOut:"",guests:1,notes:"",idType:"cedula",idNumber:"",idPhotoFile:null,privacyAccepted:false});
  const [bookError,setBookError] = useState("");
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
  const [discounts,setDiscounts] = useState([]);
  const [discountCode,setDiscountCode] = useState("");
  const [appliedDiscount,setAppliedDiscount] = useState(null);
  const [roomPriceOverrides,setRoomPriceOverrides] = useState({});
  const [seasons,setSeasons] = useState([]);
  const [editSeasons,setEditSeasons] = useState(false);
  const [newSeason,setNewSeason] = useState({name:'',startMonth:'12',startDay:'15',endMonth:'01',endDay:'05',pct:20});
  const [editRange,setEditRange] = useState(false);   // his dad's "temporary price for a date range that reverts"
  const [newRange,setNewRange] = useState({name:'',room:'all',start:'',end:'',price:''});
  const [editRoomPrices,setEditRoomPrices] = useState({});
  const [priceEdits,setPriceEdits] = useState({});
  const [addDiscountForm,setAddDiscountForm] = useState({code:"",label:"",type:"percent",amount:""});
  const [discountsLoading,setDiscountsLoading] = useState(false);
  // Admin UI
  const [editBooking,setEditBooking] = useState(null);
  const [newBookModal,setNewBookModal] = useState(false);
  const [newB,setNewB] = useState({guest:"",email:"",phone:"",room:1,checkIn:"",checkOut:"",guests:1,notes:"",source:"Direct",status:"confirmed"});
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
  const [addMsgModal,setAddMsgModal] = useState(false);
  const [newMsg,setNewMsg] = useState({guest:"",email:"",phone:"",message:""});
  const [editReview,setEditReview] = useState(null);
  const [filterStatus,setFilterStatus] = useState("all");
  const [detailB,setDetailB] = useState(null);
  const [editBError,setEditBError] = useState("");

  // Calendar — single month nav
  const [calYear,setCalYear] = useState(2026);
  const [calMonth,setCalMonth] = useState(2); // 0-indexed, 2 = March

  const t = (es,en) => lang==="es"?es:en;
  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3200); };

  // Derived
  // Revenue-earning statuses: a completed (finalizada) stay still earned money, so it MUST count.
  // Before this, only confirmed/checked_in counted — so every checked-out stay vanished from analytics.
  const REV_STATUSES = ["confirmed","checked_in","finalizada"];
  const isRev = b => REV_STATUSES.includes(b.status);
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
  const otaCommission = Math.round(bookings.filter(b=>b.source!=="Direct"&&isRev(b)).reduce((s,b)=>s+b.total*.175,0));
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

  // ─── Fetch bookings from Supabase on mount ────────────────────────
  useEffect(()=>{
    async function fetchBookings(){
      setBookingsLoading(true);
      const{data,error}=await supabase.from("bookings").select("*").order("created_at",{ascending:false});
      if(!error&&data){
        setBookings(data.map(r=>({
          id:r.id,guest:r.guest,email:r.email,phone:r.phone,
          room:r.room,checkIn:r.check_in,checkOut:r.check_out,
          nights:r.nights,guests:r.guests,total:r.total,
          status:r.status,paid:r.paid,source:r.source,notes:r.notes,
          idType:r.id_type,idNumber:r.id_number,idPhotoUrl:r.id_photo_url||"",
          createdAt:r.created_at
        })));
      }
      setBookingsLoading(false);
    }
    fetchBookings();
    fetchExpenses();
    fetchDiscounts();
    fetchRoomPrices();
    fetchRoomAvailability();
    fetchMessages();
    fetchSettings();
    fetchChannels();
    fetchDbReviews();
  },[]);
  async function fetchDbReviews(){
    const {data} = await supabase.from('reviews').select('*').order('created_at',{ascending:false});
    if(data) setDbReviews(data);
  }
  async function sendGuestEmails(){
    try{
      const {data:{session}} = await supabase.auth.getSession();
      if(!session?.access_token) return;
      await fetch('/api/guest-emails',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`}});
    }catch{}
  }

  // ─── Channel calendar sync (Airbnb / Booking.com iCal import) ───
  async function fetchChannels(){
    const [{data:feeds},{data:blocks},{data:st}] = await Promise.all([
      supabase.from('channel_calendars').select('*').order('created_at',{ascending:true}),
      supabase.from('channel_blocks').select('room_id,date,source'),
      supabase.from('settings').select('guest_emails_on').eq('id',1).maybeSingle(),
    ]);
    if(feeds) setChannelFeeds(feeds);
    if(blocks) setChannelBlocks(new Set(blocks.map(b=>`${String(b.room_id)}|${b.date}`)));
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
      const {data:{session}} = await supabase.auth.getSession();
      const res = await fetch('/api/sync-calendars',{method:'POST',headers:session?.access_token?{Authorization:`Bearer ${session.access_token}`}:{}});
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
      setMessages(data.map(r=>({id:r.id,guest:r.guest,email:r.email||r.phone,phone:r.phone,message:r.body||r.subject||"",date:r.created_at?r.created_at.slice(0,10):r.date||TODAY,read:r.read})));
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
      whatsapp: data.whatsapp || SETTINGS_INIT.whatsapp,
      email: data.email || SETTINGS_INIT.email,
      checkIn: data.check_in_time || SETTINGS_INIT.checkIn,
      checkOut: data.check_out_time || SETTINGS_INIT.checkOut,
      instagram: data.instagram || SETTINGS_INIT.instagram,
      heroSubtitle: data.hero_subtitle || SETTINGS_INIT.heroSubtitle,
      minNights: data.min_nights || SETTINGS_INIT.minNights,
      taxRate: data.tax_rate || SETTINGS_INIT.taxRate,
      currency: SETTINGS_INIT.currency,
    });
    if(data.seasons_json) {
      try { setSeasons(JSON.parse(data.seasons_json)); } catch(e) {}
    }
  }

  // ─── Fetch expenses from Supabase on mount ───────────────────────
  async function fetchDiscounts() {
    setDiscountsLoading(true);
    const {data} = await supabase.from('discounts').select('*').order('created_at',{ascending:false});
    setDiscounts(data||[]);
    setDiscountsLoading(false);
  }
  async function addDiscount() {
    if(!addDiscountForm.code||!addDiscountForm.amount) return showToast("Completa código y monto");
    const {data,error} = await supabase.from('discounts').insert([{
      code:addDiscountForm.code.toUpperCase().trim(),
      label:addDiscountForm.label,
      type:addDiscountForm.type,
      amount:parseFloat(addDiscountForm.amount),
      active:true,
    }]).select().single();
    if(error) return showToast("Error: "+error.message);
    setDiscounts(prev=>[data,...prev]);
    setAddDiscountForm({code:"",label:"",type:"percent",amount:""});
    showToast("Descuento creado ✓");
  }
  async function deleteDiscount(id) {
    if(!window.confirm("Eliminar este descuento?")) return;
    setDiscounts(prev=>prev.filter(d=>d.id!==id));
    await supabase.from('discounts').delete().eq('id',id);
    showToast("Eliminado");
  }
  async function toggleDiscount(id, active) {
    setDiscounts(prev=>prev.map(d=>d.id===id?{...d,active}:d));
    await supabase.from('discounts').update({active}).eq('id',id);
  }
  async function fetchRoomPrices() {
    const {data,error} = await supabase.from('rooms').select('id,price_override,discount,name,name_en,beds,guests,size,description,amenities,photos');
    if(error||!data) return;
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
        amenities: Array.isArray(row.amenities) ? row.amenities : r.amenities,
        // null / [] both mean "use the bundled defaults" — roomPhotos() handles the fallback
        photos:    Array.isArray(row.photos) ? row.photos : (r.photos || null),
      };
    }));
    setRoomPriceOverrides(overrides);
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
  function applyDiscountCode() {
    const code = discountCode.trim().toUpperCase();
    const disc = discounts.find(d=>d.code===code&&d.active);
    if(!disc) return showToast("Código inválido o inactivo");
    setAppliedDiscount(disc);
    const msg = disc.type==='percent' ? ("Descuento "+disc.amount+"% aplicado") : ("Descuento $"+disc.amount+" aplicado");
    showToast(msg);
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
      else if(sessionStorage.getItem('c35_view')==='admin'){sessionStorage.setItem('c35_view','public');setView("public");}
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      setAdminAuth(!!session);
    });
    return()=>subscription.unsubscribe();
  },[]);

  // ─── Supabase Realtime — live booking updates in admin ─────────
  useEffect(()=>{
    if(!adminAuth) return;
    const mapRow = r=>({id:r.id,guest:r.guest,email:r.email,phone:r.phone,room:r.room,checkIn:r.check_in||r.checkIn,checkOut:r.check_out||r.checkOut,nights:r.nights,guests:r.guests,total:parseFloat(r.total)||0,status:r.status,paid:r.paid,source:r.source,notes:r.notes,idType:r.id_type||r.idType,idNumber:r.id_number||r.idNumber,idPhotoUrl:r.id_photo_url||r.idPhotoUrl||""});
    const ch = supabase.channel("bookings-live")
      // Broadcast: instant notification sent by the booking form itself
      .on("broadcast",{event:"new_booking"},({payload})=>{
        const b = payload.booking;
        setBookings(prev=>{
          if(prev.find(x=>x.id===b.id)) return prev;
          return [mapRow(b),...prev];
        });
        showToast("🔔 Nueva reserva: "+b.guest);
      })
      // postgres_changes: catches bookings from any other source (Airbnb, manual)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"bookings"},p=>{
        const r=p.new;
        setBookings(prev=>{
          if(prev.find(x=>x.id===r.id)) return prev;
          return [mapRow(r),...prev];
        });
        showToast("🔔 Nueva reserva: "+r.guest);
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"bookings"},p=>{
        const r=p.new;
        setBookings(prev=>prev.map(b=>b.id===r.id?mapRow(r):b));
      })
      .on("postgres_changes",{event:"DELETE",schema:"public",table:"bookings"},p=>{
        setBookings(prev=>prev.filter(b=>b.id!==p.old?.id));
      })
      // Live everything: one admin's edit shows on another admin's screen instantly (no refresh).
      .on("postgres_changes",{event:"*",schema:"public",table:"rooms"},()=>{fetchRoomPrices();fetchRoomAvailability();})
      .on("postgres_changes",{event:"*",schema:"public",table:"messages"},()=>fetchMessages())
      .on("postgres_changes",{event:"*",schema:"public",table:"expenses"},()=>fetchExpenses())
      .on("postgres_changes",{event:"*",schema:"public",table:"discounts"},()=>fetchDiscounts())
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
      const mapped = data.map(r=>({
        id:r.id,guest:r.guest,email:r.email,phone:r.phone,
        room:r.room,checkIn:r.check_in,checkOut:r.check_out,
        nights:r.nights,guests:r.guests,total:r.total,
        status:r.status,paid:r.paid,source:r.source,notes:r.notes,
        idType:r.id_type,idNumber:r.id_number,idPhotoUrl:r.id_photo_url||"",
        createdAt:r.created_at
      }));
      setBookings(prev=>{
        // Only update if something actually changed (new booking or status change)
        const hasNew = mapped.some(m=>!prev.find(p=>p.id===m.id));
        const hasUpdate = mapped.some(m=>{const p=prev.find(x=>x.id===m.id);return p&&(p.status!==m.status||p.paid!==m.paid);});
        if(hasNew||hasUpdate) return mapped;
        return prev;
      });
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
    sessionStorage.setItem('c35_view','public');
    setView("public");
  }

  // ─── Guest portal lookup ─────────────────────────────────────────────
  async function lookupGuestBooking() {
    if(!guestLookup.email){setGuestLookupError(t("Ingresa tu email.","Enter your email."));return;}
    if(String(guestLookup.phone||"").replace(/[^0-9]/g,"").length<6){
      setGuestLookupError(t("Ingresa el teléfono de tu reserva.","Enter the phone number on your booking."));return;}
    setGuestLookupLoading(true);
    setGuestLookupError('');
    try {
      const res = await fetch('/api/lookup-booking', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({email: guestLookup.email.trim().toLowerCase(), phone: guestLookup.phone})
      });
      const json = await res.json();
      if(!res.ok||!json.bookings||json.bookings.length===0){
        setGuestLookupError(t("No encontramos reservas con ese email.","No bookings found for that email."));
        setGuestLookupLoading(false);
        return;
      }
      setGuestBooking(json.bookings[0]);
    } catch(e) {
      setGuestLookupError(t("Error al buscar. Intenta de nuevo.","Error searching. Please try again."));
    }
    setGuestLookupLoading(false);
  }

  // ─── Public booking submit with conflict check ──────────────────────
  async function submitBooking() {
    const rm = rooms.find(r=>r.id===selRoom);
    if(!bookForm.privacyAccepted){setBookError(t("Debes aceptar la política de privacidad.","You must accept the privacy policy."));return;}
    if(!bookForm.name.trim()){setBookError(t("Por favor ingresa tu nombre.","Please enter your name."));return;}
    if(!bookForm.phone.trim()){setBookError(t("Por favor ingresa tu WhatsApp.","Please enter your WhatsApp number."));return;}
    if(!bookForm.idNumber.trim()){setBookError(t("Por favor ingresa tu número de identificación.","Please enter your ID number."));return;}
    if(!bookForm.idPhotoFile){setBookError(t("Por favor sube una foto de tu cédula o pasaporte.","Please upload a photo of your ID or passport."));return;}
    if(!bookForm.checkIn||!bookForm.checkOut){setBookError(t("Por favor selecciona fechas.","Please select dates."));return;}
    if(bookForm.checkIn>=bookForm.checkOut){setBookError(t("La salida debe ser después de la entrada.","Check-out must be after check-in."));return;}
    if(hasConflict(bookings,selRoom,bookForm.checkIn,bookForm.checkOut)||channelConflict(channelBlocks,selRoom,bookForm.checkIn,bookForm.checkOut)){
      setBookError(t("Lo sentimos, esa habitación no está disponible para las fechas seleccionadas. Por favor elige otras fechas.","Sorry, that room is not available for the selected dates. Please choose different dates."));
      return;
    }
    const basePrice = roomPriceOverrides[rm.id] || rm.price;
    const effPrice = rm.discount>0 ? Math.round(basePrice*(1-rm.discount/100)) : basePrice;
    const pricing = calcPrice(effPrice, bookForm.checkIn, bookForm.checkOut, appliedDiscount, seasons, rm.id);
    // Upload ID photo to Supabase Storage
    let idPhotoUrl = '';
    if(bookForm.idPhotoFile) {
      try {
        idPhotoUrl = await compressImage(bookForm.idPhotoFile);
      } catch(e) {
        showToast("⚠️ Error al procesar foto: " + e.message);
      }
    }
    const bookingData = {
      guest:bookForm.name, email:bookForm.email||'', phone:bookForm.phone,
      room:selRoom, check_in:bookForm.checkIn, check_out:bookForm.checkOut,
      nights:pricing.nights, guests:parseInt(bookForm.guests),
      status:'pending', total:pricing.total, paid:false,
      source:'Direct', notes:bookForm.notes||'', id_type:bookForm.idType, id_number:bookForm.idNumber.trim(),
      id_photo_url:idPhotoUrl,
    };
    let {data:ins,error} = await supabase.from('bookings').insert([bookingData]).select().single();
    // Fallback: if id_photo_url column doesn't exist yet, retry without it
    if(error) {
      const {id_photo_url:_, ...bookingDataNoPhoto} = bookingData;
      ({data:ins,error} = await supabase.from('bookings').insert([bookingDataNoPhoto]).select().single());
    }
    if(error || !ins){ setBookError("Error al guardar la reserva: "+(error?.message||"desconocido")); return; }
    // Use the REAL database id — PayPal deposit + the confirmation flow depend on it matching the row.
    const newBooking = {...bookingData, id:ins.id, checkIn:bookingData.check_in, checkOut:bookingData.check_out, idType:bookingData.id_type, idNumber:bookingData.id_number, idPhotoUrl:idPhotoUrl||""};
    setBookings(prev=>[newBooking,...prev]);
    supabase.channel('bookings-broadcast').send({type:'broadcast',event:'new_booking',payload:{booking:newBooking}});
    fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({type:'guest_confirmation',booking:{...newBooking,guest:bookForm.name},room:rm})});
    fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({type:'admin_notification',booking:{...newBooking,guest:bookForm.name},room:rm})});
    setBookModal(false);
    setBookForm({name:"",email:"",phone:"",checkIn:"",checkOut:"",guests:1,notes:"",idType:"cedula",idNumber:"",idPhotoFile:null,privacyAccepted:false});
    setBookError("");
    setShowConfirmation({booking:{...newBooking,name:bookForm.name}, room:rm});
  }
  // ─── Admin booking save with conflict check ─────────────────────────
  async function saveBooking(b) {
    if(b.checkIn&&b.checkOut&&b.status!=="cancelled") {
      if(hasConflict(bookings,b.room,b.checkIn,b.checkOut,b.id)||channelConflict(channelBlocks,b.room,b.checkIn,b.checkOut)){
        setEditBError(t("Conflicto de fechas: esa habitación ya tiene una reserva en ese período (incluye Airbnb/Booking).","Date conflict: that room already has a booking in that period (incl. Airbnb/Booking)."));
        return;
      }
    }
    const rm = rooms.find(r=>r.id===b.room);
    const n = b.checkIn&&b.checkOut?nights(b.checkIn,b.checkOut):1;
    const pricing = calcPrice(rm?.price||0, b.checkIn||TODAY, b.checkOut||TODAY, null, seasons, rm?.id);
    const updated = {...b, total:pricing.total, subtotal:pricing.subtotal, tax:pricing.tax};
    // Persist FIRST, then update the UI — otherwise a silent failure "saves" locally and reverts on refresh.
    const {error} = await supabase.from("bookings").update({guest:updated.guest,email:updated.email,phone:updated.phone,room:updated.room,check_in:updated.checkIn,check_out:updated.checkOut,guests:updated.guests,status:updated.status,total:updated.total,paid:updated.paid,source:updated.source,notes:updated.notes}).eq("id",updated.id);
    if(error){ setEditBError("Error al guardar: "+error.message); return; }
    setBookings(bookings.map(x=>x.id===b.id?updated:x));
    setEditBooking(null);setDetailB(null);setEditBError("");
    showToast("Reserva guardada ✓");
  }

  async function addBookingAdmin() {
    if(!newB.guest.trim()){setNewBError("Nombre requerido.");return;}
    if(!newB.checkIn||!newB.checkOut){setNewBError("Fechas requeridas.");return;}
    if(newB.checkIn>=newB.checkOut){setNewBError("La salida debe ser después de la entrada.");return;}
    if(newB.status!=="cancelled"&&(hasConflict(bookings,newB.room,newB.checkIn,newB.checkOut)||channelConflict(channelBlocks,newB.room,newB.checkIn,newB.checkOut))){
      setNewBError("Conflicto de fechas: esa habitación ya tiene una reserva en ese período.");return;
    }
    const rm = rooms.find(r=>r.id===newB.room);
    const pricing = calcPrice(rm?.price||0,newB.checkIn,newB.checkOut,null,seasons,rm?.id);
    const bData = {guest:newB.guest,email:newB.email,phone:newB.phone,room:newB.room,check_in:newB.checkIn,check_out:newB.checkOut,nights:pricing.nights,guests:newB.guests,total:pricing.total,status:newB.status,paid:newB.paid||false,source:newB.source,notes:newB.notes};
    const {data:ins,error} = await supabase.from("bookings").insert([bData]).select().single();
    if(error){showToast("Error: "+error.message);return;}
    setBookings([ins&&ins.id?{...newB,...ins,checkIn:ins.check_in,checkOut:ins.check_out}:{...newB,id:Date.now(),total:pricing.total,subtotal:pricing.subtotal,tax:pricing.tax},...bookings]);
    setNewBookModal(false);
    setNewB({guest:"",email:"",phone:"",room:1,checkIn:"",checkOut:"",guests:1,notes:"",source:"Direct",status:"confirmed"});
    setNewBError("");
    showToast("Reserva creada ✓");
  }

  async function saveRoom(){
    // Persist price, availability AND the editable content (name/beds/size/guests/amenities/description).
    // Before this, only price+available were saved, so size/beds/etc. reverted on refresh (dad's bug).
    const {error} = await supabase.from('rooms').upsert({
      id: String(editRoomD.id),
      price_override: editRoomD.price,
      available: editRoomD.available,
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
    const updated = rooms.map(r=>r.id===editRoomD.id?editRoomD:r);
    setRooms(updated);
    setRoomAvail(prev=>({...prev,[editRoomD.id]:editRoomD.available}));
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

  async function fetchRoomAvailability() {
    const {data} = await supabase.from('rooms').select('id,available');
    if(data){ const m={}; data.forEach(r=>{m[r.id]=r.available;}); setRoomAvail(m); }
  }
  async function toggleRoomAvail(id) {
    const newVal = roomAvail[id] === false ? true : false; // default is available
    const {error} = await supabase.from('rooms').upsert({id,available:newVal},{onConflict:'id'});
    if(error){ showToast("❌ Error: "+error.message); return; }
    setRoomAvail(prev=>({...prev,[id]:newVal}));
    showToast(newVal ? "Habitación habilitada ✓" : "Habitación marcada como cerrada");
  }
  async function updateBookingStatus(id, status) {
    const {error} = await supabase.from('bookings').update({status}).eq('id',id);
    if(error){ showToast("❌ Error al guardar: "+error.message); return; }
    setBookings(prev=>prev.map(x=>x.id===id?{...x,status}:x));
    showToast(status==="confirmed"?"Confirmada ✓":"Cancelada");
    if(status==="confirmed"){
      const bk=bookings.find(b=>b.id===id);
      const rm=rooms.find(r=>r.id===bk?.room);
      if(bk&&rm) fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({type:'booking_confirmed',booking:bk,room:rm})}).catch(()=>{});
    }
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
    const bk = bookings.find(b=>b.id===bookingId);
    const {error} = await supabase.from('bookings').update({status:"finalizada"}).eq('id',bookingId);
    if(error){ showToast("❌ Error al guardar check-out: "+error.message); return; }
    setBookings(prev=>prev.map(b=>b.id===bookingId?{...b,status:"finalizada"}:b));
    setDetailB(prev=>prev?{...prev,status:"finalizada"}:null);
    showToast("Check-out registrado ✓ Estancia finalizada");
    if(bk?.room){
      setRoomAvail(prev=>({...prev,[bk.room]:true}));
      await supabase.from('rooms').upsert({id:bk.room,available:true},{onConflict:'id'});
    }
  }
  async function deleteBooking(id) {
    const {error} = await supabase.from('bookings').delete().eq('id',id);
    if(error){ showToast("Error al eliminar: "+error.message); return; }
    setBookings(prev=>prev.filter(b=>b.id!==id));
    setEditBooking(null); setDetailB(null);
    showToast("Reserva eliminada");
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

  // ─── Availability checker ────────────────────────────────────────

  async function checkAvailability() {
    if(!availDates.checkIn||!availDates.checkOut||availDates.checkIn>=availDates.checkOut) return;
    setAvailLoading(true);
    try {
      const res = await fetch(`/api/check-availability?check_in=${availDates.checkIn}&check_out=${availDates.checkOut}`);
      const data = await res.json();
      setBookedRoomIds(data.bookedRooms||[]);
    } catch(e) { console.error(e); }
    setAvailLoading(false);
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

  const galItems = galFilter==="all"?GALLERY:GALLERY.filter(g=>g.tag===galFilter);

  // ─── Print/export bookings ────────────────────────────────────────
  function printReport() {
    const rows = bookings.map(b=>{
      const rm = rooms.find(r=>r.id===b.room);
      return `<tr style="border-bottom:1px solid #eee"><td>${b.guest}</td><td>${rm?.name||""}</td><td>${b.checkIn}</td><td>${b.checkOut}</td><td>${b.status}</td><td>${fmtMoney(b.total)}</td><td>${b.paid?"Pagado":"Pendiente"}</td></tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><title>Reporte Caonabo 35</title>
      <style>body{font-family:Arial;padding:2cm}table{width:100%;border-collapse:collapse}th{background:#2A1F16;color:#C4973A;padding:8px;text-align:left}td{padding:8px}h1{color:#2A1F16}p{color:#8B6B4E;margin-bottom:1rem}</style>
      </head><body>
      <h1>Caonabo 35 — Reporte de Reservas</h1>
      <p>Generado: ${new Date().toLocaleDateString()} · Total reservas: ${bookings.length} · Ingresos confirmados: ${fmtMoney(totalRev)}</p>
      <table><thead><tr><th>Huésped</th><th>Habitación</th><th>Entrada</th><th>Salida</th><th>Estado</th><th>Total</th><th>Pago</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;
    const w = window.open("","_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  }

  // (Stripe return handler — kept here so hook order is consistent)
  useEffect(()=>{
    const p = new URLSearchParams(window.location.search);
    if(p.get('stripe')==='success'){showToast('✅ ¡Pago recibido! Tu reserva está confirmada.');window.history.replaceState({},'',window.location.pathname);}
    else if(p.get('stripe')==='cancelled'){showToast('Pago cancelado.');window.history.replaceState({},'',window.location.pathname);}
  },[]);

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

    const adminTabs=[
      ["dashboard","📊 Dashboard"],
      ["bookings",`📋 Reservas${pendingCnt>0?` (${pendingCnt})`:""}`],
      ["calendar","📅 Calendario"],
      ["precios","💲 Precios"],
      ["rooms","🏠 Habitaciones"],
      ["messages",`💬 Mensajes${unreadCnt>0?` (${unreadCnt})`:""}`],
      ["finances","💰 Finanzas"],
      ["reviews","⭐ Reseñas"],
      ["analytics","📈 Analíticas"],
      ["settings","⚙️ Config"],
    ];

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
            {adminTabs.map(([id,lbl])=>(
              <div key={id} className={`sb${adminTab===id?" act":""}`} onClick={()=>setAdminTab(id)}>{lbl}</div>
            ))}
          </div>
          <div style={{borderTop:`1px solid ${C.mahogany}50`,paddingBottom:".5rem"}}>
            <div className="sb" onClick={printReport}>🖨️ Imprimir Reporte</div>
            <div className="sb" onClick={async()=>{await supabase.auth.signOut();setAdminAuth(false);sessionStorage.setItem('c35_view','public');setView("public");}}>🌐 Ver Sitio Público</div>
            <div className="sb" onClick={adminLogout}>🚪 Cerrar Sesión</div>
          </div>
        </div>

        {/* Mobile tab bar */}
        <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.ebony,zIndex:100,overflowX:"auto",borderTop:`1px solid ${C.mahogany}50`}} className="mob-tabbar">
          <div style={{display:"flex",minWidth:"max-content"}}>
            {adminTabs.slice(0,6).map(([id,lbl])=>(
              <button key={id} onClick={()=>setAdminTab(id)} style={{background:"none",border:"none",color:adminTab===id?C.gold:C.taupe,padding:".6rem .9rem",fontFamily:"'Lato',sans-serif",fontSize:".6rem",cursor:"pointer",whiteSpace:"nowrap"}}>{lbl}</button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
          <div style={{background:C.white,padding:"1rem 1.75rem",borderBottom:`1px solid ${C.parchment}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:50,flexWrap:"wrap",gap:".5rem"}}>
            <h1 style={{margin:0,fontSize:"1.2rem",fontWeight:400,color:C.ebony}}>{adminTabs.find(x=>x[0]===adminTab)?.[1]}</h1>
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
                            <a href={`https://wa.me/${(b.phone||"").replace(/\D/g,"")}`} style={{textDecoration:"none"}}><button className="btn-sm-o" style={{fontSize:".58rem",padding:".2rem .45rem"}}>WA</button></a>
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
              <div style={{display:"flex",alignItems:"center",gap:"1rem"}}>
                <button className="btn-sm-o" style={{padding:".42rem .85rem"}} onClick={calNavPrev}>←</button>
                <h2 style={{fontSize:"1.15rem",fontWeight:400,color:C.ebony,minWidth:200,textAlign:"center"}}>{calTitle}</h2>
                <button className="btn-sm-o" style={{padding:".42rem .85rem"}} onClick={calNavNext}>→</button>
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
                        else{setNewB(prev=>({...prev,checkIn:dateStr,checkOut:dateStr}));setNewBookModal(true);setNewBError("");}
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
                      <span style={{fontFamily:"'Lato',sans-serif",fontSize:".74rem",color:C.taupe}}>{m.email}</span>
                      {!m.read&&<span style={{background:C.gold,color:C.ebony,padding:".1rem .5rem",borderRadius:20,fontSize:".62rem",fontFamily:"'Lato',sans-serif",fontWeight:700}}>NUEVO</span>}
                    </div>
                    <span style={{fontFamily:"'Lato',sans-serif",fontSize:".73rem",color:C.taupe}}>{m.date}</span>
                  </div>
                  <p style={{fontStyle:"italic",color:C.ebony,lineHeight:1.7,marginBottom:".9rem"}}>"{m.message}"</p>
                  <div style={{display:"flex",gap:".5rem",flexWrap:"wrap"}}>
                    <button className="btn-sm" onClick={()=>{setReplyModal(m);setReplyTxt("");markMessageRead(m.id);}}>Responder</button>
                    <a href={`https://wa.me/${(m.phone||settings.whatsapp).replace(/\D/g,"")}`} style={{textDecoration:"none"}}><button className="btn-sm-o">WhatsApp</button></a>
                    <a href={`mailto:${m.email}`} style={{textDecoration:"none"}}><button className="btn-sm-o">Email</button></a>
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
              {[[fmtMoney(totalRev),"Ingresos",C.warm],[fmtMoney(netRevenue),"Ingreso Neto (post-comisión)",netRevenue>=0?C.olive:C.danger],[Math.round((occupiedToday/rooms.length)*100)+"%","Ocup. Hoy",C.olive],[fmtMoney(adr),"ADR · Tarifa Media",C.gold],[fmtMoney(revpar30),"RevPAR (30 días)",C.warm],[bookings.filter(b=>b.source==="Direct").length,"Reservas Directas",C.mahogany],[fmtMoney(otaCommission),"Comisiones OTA",C.danger],[reviews.filter(r=>r.approved).length+"",`Reseñas (${(reviews.reduce((s,r)=>s+r.rating,0)/Math.max(reviews.length,1)).toFixed(1)}⭐)`,C.gold]].map(([v,l,col])=>(
                <div key={l} className="stat" style={{borderTopColor:col}}><div className="stat-v" style={{color:col,fontSize:"1.55rem"}}>{v}</div><div className="stat-l">{l}</div></div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}} className="mob-full">
              <div className="card" style={{padding:"1.5rem"}}>
                <h3 style={{fontFamily:"'Lato',sans-serif",fontSize:".77rem",letterSpacing:".1em",textTransform:"uppercase",color:C.warm,marginBottom:"1.4rem"}}>Canales de Reserva</h3>
                {[["Direct",C.warm],["Airbnb","#FF5A5F"],["Booking.com","#003580"]].map(([src,col])=>{
                  const cnt=bookings.filter(b=>b.source===src&&isRev(b)).length;
                  const rev=bookings.filter(b=>b.source===src&&isRev(b)).reduce((s,b)=>s+b.total,0);
                  const pct=bookings.filter(isRev).length?Math.round((cnt/bookings.filter(isRev).length)*100):0;
                  return(
                    <div key={src} style={{marginBottom:"1.1rem"}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontFamily:"'Lato',sans-serif",fontSize:".8rem",marginBottom:".28rem"}}>
                        <span style={{color:C.ebony,fontWeight:600}}>{src}</span>
                        <span style={{color:C.taupe}}>{cnt} reservas · {pct}% · {fmtMoney(rev)}</span>
                      </div>
                      <div style={{background:C.parchment,height:9}}><div style={{background:col,width:`${pct}%`,height:"100%"}}/></div>
                    </div>
                  );
                })}
                <div style={{marginTop:"1.4rem",padding:".9rem 1.1rem",background:C.smoke,borderLeft:`3px solid ${C.gold}`}}>
                  <p style={{fontFamily:"'Lato',sans-serif",fontSize:".79rem",color:C.warm,lineHeight:1.65}}>Reservas directas ahorran comisiones estimadas de <strong>{fmtMoney(Math.round(bookings.filter(b=>b.source!=="Direct"&&isRev(b)).reduce((s,b)=>s+b.total*.175,0)))}</strong>.</p>
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
                <button className="btn-sm" onClick={()=>{setSettDraft({...settings});setEditSettings(true);}}>✏️ Editar</button>
              </div>
              {[["Nombre",settings.propName],["Dirección",settings.address],["Teléfono",settings.phone],["WhatsApp",settings.whatsapp],["Email",settings.email],["Check-in",settings.checkIn],["Check-out",settings.checkOut],["Instagram",settings.instagram],["Noches mínimas",settings.minNights]].map(([l,v])=>(
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
                <button className="btn-sm-o" onClick={async()=>{await supabase.auth.signOut();setAdminAuth(false);sessionStorage.setItem('c35_view','public');setView("public");}}>🌐 Ver Sitio Público</button>
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
                    const avail=roomAvail[r.id]!==false;
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
                <a href="/api/export-ical" download="caonabo35.ics" style={{textDecoration:"none"}}>
                  <button className="btn-sm-o" style={{marginBottom:"1rem"}}>📅 Exportar Calendario (.ics)</button>
                </a>
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
                {editBError&&<div className="error-banner">{editBError}</div>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                  <div style={{gridColumn:"1/-1"}}><FL>Nombre del Huésped</FL><Inp value={editBooking.guest||""} onChange={e=>setEditBooking({...editBooking,guest:e.target.value})}/></div>
                  <div><FL>Email</FL><Inp type="email" value={editBooking.email||""} onChange={e=>setEditBooking({...editBooking,email:e.target.value})}/></div>
                  <div><FL>Teléfono / WhatsApp</FL><Inp type="tel" value={editBooking.phone||""} onChange={e=>setEditBooking({...editBooking,phone:e.target.value})}/></div>
                  <div><FL>Habitación</FL><Sel value={editBooking.room} onChange={e=>setEditBooking({...editBooking,room:parseInt(e.target.value)})}>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</Sel></div>
                  <div><FL>Fuente</FL><Sel value={editBooking.source} onChange={e=>setEditBooking({...editBooking,source:e.target.value})}>{["Direct","Airbnb","Booking.com","WhatsApp","Teléfono"].map(s=><option key={s}>{s}</option>)}</Sel></div>
                  <div><FL>Check-in</FL><Inp type="date" value={editBooking.checkIn} onChange={e=>setEditBooking({...editBooking,checkIn:e.target.value})}/></div>
                  <div><FL>Check-out</FL><Inp type="date" value={editBooking.checkOut} onChange={e=>setEditBooking({...editBooking,checkOut:e.target.value})}/></div>
                  <div><FL>Huéspedes</FL><Sel value={editBooking.guests} onChange={e=>setEditBooking({...editBooking,guests:parseInt(e.target.value)})}>{[1,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}</Sel></div>
                  <div><FL>Estado</FL><Sel value={editBooking.status} onChange={e=>setEditBooking({...editBooking,status:e.target.value})}><option value="confirmed">Confirmada</option><option value="pending">Pendiente</option><option value="cancelled">Cancelada</option></Sel></div>
                </div>
                {editBooking.checkIn&&editBooking.checkOut&&editBooking.checkIn<editBooking.checkOut&&(()=>{
                  const rm=rooms.find(r=>r.id===editBooking.room);
                  const p=calcPrice(rm?.price||0,editBooking.checkIn,editBooking.checkOut,null,seasons,rm?.id);
                  return(
                    <div className="price-breakdown">
                      <div className="price-row"><span>${rm?.price} × {p.nights} noches</span><span>{fmtMoney(p.subtotal)}</span></div>
                      <div className="price-row total"><span>Total</span><span>{fmtMoney(p.total)}</span></div>
                    </div>
                  );
                })()}
                <div style={{marginBottom:"1rem"}}><FL>Notas</FL><Inp value={editBooking.notes||""} onChange={e=>setEditBooking({...editBooking,notes:e.target.value})}/></div>
                <label style={{display:"flex",alignItems:"center",gap:".5rem",fontFamily:"'Lato',sans-serif",fontSize:".83rem",cursor:"pointer",marginBottom:"1.4rem"}}><input type="checkbox" checked={editBooking.paid} onChange={e=>setEditBooking({...editBooking,paid:e.target.checked})}/> Marcar como pagado</label>
                <div style={{display:"flex",gap:".65rem",flexWrap:"wrap"}}>
                  <button className="btn-gold" style={{flex:1}} onClick={()=>saveBooking(editBooking)}>GUARDAR CAMBIOS</button>
                  <button className="btn-danger" style={{padding:".75rem 1.25rem"}} onClick={()=>deleteBooking(editBooking.id)}>Eliminar</button>
                </div>
              </>):(
                <div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",fontFamily:"'Lato',sans-serif",marginBottom:"1.25rem"}}>
                    {[["Email",detailB?.email],["Teléfono",detailB?.phone],["Habitación",rooms.find(r=>r.id===detailB?.room)?.name],["Check-in",detailB?.checkIn],["Check-out",detailB?.checkOut],["Noches",detailB?.checkIn&&detailB?.checkOut?nights(detailB.checkIn,detailB.checkOut):"-"],["Huéspedes",detailB?.guests],["Fuente",detailB?.source],["Total",fmtMoney(detailB?.total||0)],["Pago",detailB?.paid?"✓ Pagado":"Pendiente"]].map(([l,v])=>(
                      <div key={l}><div style={{fontSize:".62rem",color:C.taupe,textTransform:"uppercase",letterSpacing:".12em",marginBottom:".2rem"}}>{l}</div><div style={{fontWeight:700,color:C.ebony,fontSize:".87rem"}}>{v}</div></div>
                    ))}
                  </div>
                  {detailB?.idNumber&&<div style={{padding:".85rem 1rem",background:"#FFF8E1",borderLeft:`3px solid ${C.gold}`,marginBottom:"1rem",fontFamily:"'Lato',sans-serif"}}><div style={{fontSize:".62rem",color:C.taupe,textTransform:"uppercase",letterSpacing:".12em",marginBottom:".3rem"}}>Identificación</div><div style={{fontWeight:700,color:C.ebony,fontSize:".9rem"}}>{detailB.idType==='cedula'?'🪪 Cédula':'🛂 Pasaporte'}: {detailB.idNumber}</div></div>}
                  {detailB?.idPhotoUrl&&<div style={{padding:".85rem 1rem",background:"#FFF8E1",borderLeft:`3px solid ${C.gold}`,marginBottom:"1rem",fontFamily:"'Lato',sans-serif"}}><div style={{fontSize:".62rem",color:C.taupe,textTransform:"uppercase",letterSpacing:".12em",marginBottom:".5rem"}}>Foto de ID</div><img src={detailB.idPhotoUrl} alt="ID" style={{maxWidth:"100%",maxHeight:200,borderRadius:6,display:"block",border:`1px solid ${C.sand}`,cursor:"pointer"}} onClick={()=>{const w=window.open('','_blank');w.document.write('<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="'+detailB.idPhotoUrl+'" style="max-width:100%;max-height:100vh;object-fit:contain"></body></html>');w.document.close();}}/><button onClick={()=>{const w=window.open('','_blank');w.document.write('<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="'+detailB.idPhotoUrl+'" style="max-width:100%;max-height:100vh;object-fit:contain"></body></html>');w.document.close();}} style={{background:"none",border:"none",fontSize:".72rem",color:C.gold,marginTop:".4rem",display:"inline-block",cursor:"pointer",padding:0,fontFamily:"'Lato',sans-serif"}}>Ver foto completa ↗</button></div>}
                  {detailB?.notes&&<div style={{padding:".85rem 1rem",background:C.smoke,borderLeft:`3px solid ${C.gold}`,marginBottom:"1.25rem"}}><p style={{fontStyle:"italic",color:C.ebony,fontFamily:"'Lato',sans-serif",fontSize:".86rem"}}>{detailB.notes}</p></div>}
                  {detailB?.status==="finalizada"&&<div className="success-banner" style={{marginBottom:"1rem",fontWeight:700,fontSize:".88rem"}}>✓ Estancia completada — Check-out realizado</div>}
                  <div style={{display:"flex",gap:".65rem",flexWrap:"wrap"}}>
                    <button className="btn-gold" onClick={()=>{setEditBooking({...detailB});setDetailB(null);setEditBError("");}}>✏️ Editar</button>
                    {detailB?.status==="pending"&&<><button className="btn-success" style={{padding:".72rem 1.3rem"}} onClick={()=>{updateBookingStatus(detailB.id,"confirmed");setDetailB(null);}}>✓ Confirmar</button><button className="btn-danger" style={{padding:".72rem 1.3rem"}} onClick={()=>{updateBookingStatus(detailB.id,"cancelled");setDetailB(null);}}>✗ Cancelar</button></>}
                    {detailB?.status==="confirmed"&&<button style={{padding:".72rem 1.3rem",background:"#1565C0",color:"#fff",border:"none",borderRadius:4,fontFamily:"'Lato',sans-serif",fontWeight:700,fontSize:".78rem",cursor:"pointer",letterSpacing:".08em"}} onClick={()=>checkInGuest(detailB.id)}>🏨 Check In</button>}
                    {detailB?.status==="checked_in"&&<button style={{padding:".72rem 1.3rem",background:"#6A1B9A",color:"#fff",border:"none",borderRadius:4,fontFamily:"'Lato',sans-serif",fontWeight:700,fontSize:".78rem",cursor:"pointer",letterSpacing:".08em"}} onClick={()=>checkOutGuest(detailB.id)}>🚪 Check Out</button>}
                    {!detailB?.paid&&(detailB?.status==="confirmed"||detailB?.status==="checked_in")&&<button className="btn-success" style={{padding:".72rem 1.3rem"}} onClick={()=>{markPaid(detailB.id);setDetailB({...detailB,paid:true});}}>$ Pagado</button>}
                    <a href={`https://wa.me/${(detailB?.phone||"").replace(/\D/g,"")}`} style={{textDecoration:"none"}}><button className="btn-out" style={{padding:".65rem 1.2rem",fontSize:".7rem"}}>WhatsApp</button></a>
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
              {newBError&&<div className="error-banner">{newBError}</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                <div style={{gridColumn:"1/-1"}}><FL>Nombre del Huésped *</FL><Inp value={newB.guest} onChange={e=>setNewB({...newB,guest:e.target.value})}/></div>
                <div><FL>Email</FL><Inp type="email" value={newB.email} onChange={e=>setNewB({...newB,email:e.target.value})}/></div>
                <div><FL>Teléfono / WhatsApp</FL><Inp type="tel" value={newB.phone} onChange={e=>setNewB({...newB,phone:e.target.value})}/></div>
                <div><FL>Habitación *</FL><Sel value={newB.room} onChange={e=>setNewB({...newB,room:parseInt(e.target.value)})}>{rooms.map(r=><option key={r.id} value={r.id}>{r.name} · ${r.price}/noche</option>)}</Sel></div>
                <div><FL>Fuente</FL><Sel value={newB.source} onChange={e=>setNewB({...newB,source:e.target.value})}>{["Direct","Airbnb","Booking.com","WhatsApp","Teléfono"].map(s=><option key={s}>{s}</option>)}</Sel></div>
                <div><FL>Check-in *</FL><Inp type="date" value={newB.checkIn} onChange={e=>setNewB({...newB,checkIn:e.target.value})}/></div>
                <div><FL>Check-out *</FL><Inp type="date" value={newB.checkOut} onChange={e=>setNewB({...newB,checkOut:e.target.value})}/></div>
                <div><FL>Huéspedes</FL><Sel value={newB.guests} onChange={e=>setNewB({...newB,guests:parseInt(e.target.value)})}>{[1,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}</Sel></div>
                <div><FL>Estado</FL><Sel value={newB.status} onChange={e=>setNewB({...newB,status:e.target.value})}><option value="confirmed">Confirmada</option><option value="pending">Pendiente</option></Sel></div>
                <div style={{gridColumn:"1/-1"}}><FL>Notas</FL><Inp value={newB.notes} onChange={e=>setNewB({...newB,notes:e.target.value})}/></div>
              </div>
              {newB.checkIn&&newB.checkOut&&newB.checkIn<newB.checkOut&&(()=>{
                const rm=rooms.find(r=>r.id===newB.room);
                const p=calcPrice(rm?.price||0,newB.checkIn,newB.checkOut,null,seasons,rm?.id);
                return(
                  <div className="price-breakdown">
                    <div className="price-row"><span>${rm?.price} × {p.nights} noches</span><span>{fmtMoney(p.subtotal)}</span></div>
                    <div className="price-row total"><span>Total</span><span>{fmtMoney(p.total)}</span></div>
                  </div>
                );
              })()}
              <button className="btn-gold" style={{width:"100%",marginTop:".5rem"}} onClick={addBookingAdmin}>CREAR RESERVA</button>
            </div>
          </ModalBox>
        </Backdrop>)}

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
                <a href={`https://wa.me/${(replyModal.phone||settings.whatsapp).replace(/\D/g,"")}?text=${encodeURIComponent(replyTxt)}`} target="_blank" rel="noopener" style={{textDecoration:"none",flex:1}}>
                  <button className="btn-gold" style={{width:"100%"}}>📱 Enviar por WhatsApp</button>
                </a>
                <a href={`mailto:${replyModal.email}?subject=Caonabo 35&body=${encodeURIComponent(replyTxt)}`} style={{textDecoration:"none"}}>
                  <button className="btn-out">📧 Email</button>
                </a>
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
              {[["propName","Nombre del Negocio"],["phone","Teléfono"],["whatsapp","WhatsApp (solo números)"],["email","Email"],["checkIn","Hora Check-in"],["checkOut","Hora Check-out"],["instagram","Instagram"],["heroSubtitle","Subtítulo del Hero"]].map(([k,l])=>(
                <div key={k} style={{marginBottom:".85rem"}}><FL>{l}</FL><Inp value={settDraft[k]} onChange={e=>setSettDraft({...settDraft,[k]:e.target.value})}/></div>
              ))}
              <div style={{marginBottom:".85rem"}}><FL>Dirección</FL><textarea value={settDraft.address} onChange={e=>setSettDraft({...settDraft,address:e.target.value})} style={{width:"100%",padding:".7rem 1rem",border:`1px solid ${C.sand}`,fontFamily:"'Lato',sans-serif",fontSize:".88rem",background:C.smoke,height:65,resize:"vertical",outline:"none",color:C.ebony}}/></div>
              <div style={{marginBottom:"1.25rem"}}><FL>Impuesto (%)</FL><Inp type="number" value={settDraft.taxRate} onChange={e=>setSettDraft({...settDraft,taxRate:parseFloat(e.target.value)||0})}/></div>
              <button className="btn-gold" style={{width:"100%"}} onClick={async()=>{const{error}=await supabase.from("settings").update({hotel_name:settDraft.propName,address:settDraft.address,phone:settDraft.phone,whatsapp:settDraft.whatsapp,email:settDraft.email,instagram:settDraft.instagram,hero_subtitle:settDraft.heroSubtitle,check_in_time:settDraft.checkIn,check_out_time:settDraft.checkOut,min_nights:settDraft.minNights,tax_rate:settDraft.taxRate}).eq("id",1);if(error){showToast("❌ Error al guardar: "+error.message);return;}setSettings(settDraft);setEditSettings(false);showToast("Configuración guardada ✓");}}>GUARDAR</button>
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
              <button className="btn-gold" style={{width:"100%"}} onClick={()=>{if(!newMsg.guest||!newMsg.message)return;setMessages([...messages,{...newMsg,id:Date.now(),date:TODAY,read:true}]);setAddMsgModal(false);setNewMsg({guest:"",email:"",phone:"",message:""});showToast("Mensaje añadido ✓");}}>GUARDAR</button>
            </div>
          </ModalBox>
        </Backdrop>)}

      </div>
    );
  } // end admin


  // ═══════════════════════════════════════════════════════════════════
  // PUBLIC SITE
  // ═══════════════════════════════════════════════════════════════════
  return(
    <div style={{fontFamily:"'Cormorant Garamond',serif",background:C.ivory,minHeight:"100vh",color:C.ebony}}>
      <style>{css}</style>

      {/* NAV */}
      <nav style={{background:C.ebony,padding:"0 2.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:200,flexWrap:"wrap",gap:".5rem"}}>
        <div style={{display:"flex",flexDirection:"column",padding:".95rem 0",cursor:"pointer"}} onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}>
          <span style={{color:C.gold,fontSize:"1.35rem",fontWeight:600,letterSpacing:".12em"}}>CAONABO 35</span>
          <span style={{color:C.taupe,fontSize:".55rem",fontFamily:"'Lato',sans-serif",letterSpacing:".25em",textTransform:"uppercase"}}>Santo Domingo · R.D.</span>
        </div>
        <div style={{display:"flex",gap:"1.8rem",alignItems:"center",flexWrap:"wrap",padding:".5rem 0"}}>
          {[["rooms",t("Habitaciones","Rooms")],["gallery",t("Galería","Gallery")],["amenities",t("Servicios","Services")],["contact","Contacto"]].map(([id,lbl])=>(
            <span key={id} className="nav-lnk" onClick={()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"})}>{lbl}</span>
          ))}
          <span style={{cursor:"pointer",color:C.taupe,fontFamily:"'Lato',sans-serif",fontSize:".69rem",letterSpacing:".1em",borderLeft:`1px solid ${C.mahogany}60`,paddingLeft:"1.5rem"}} onClick={()=>setLang(lang==="es"?"en":"es")}>{lang==="es"?"EN":"ES"}</span>
          <span style={{cursor:"pointer",fontFamily:"'Lato',sans-serif",fontSize:".68rem",letterSpacing:".12em",color:C.ebony,padding:".38rem .95rem",border:`1px solid ${C.sand}`,background:C.smoke}} onClick={()=>setGuestPortalOpen(true)}>{t("MI RESERVA","MY BOOKING")}</span>
          <span style={{cursor:"pointer",background:`${C.gold}14`,color:C.gold,fontFamily:"'Lato',sans-serif",fontSize:".68rem",letterSpacing:".12em",padding:".38rem .95rem",border:`1px solid ${C.gold}35`}} onClick={()=>{sessionStorage.setItem('c35_view','admin');setView("admin");}}>ADMIN</span>
        </div>
      </nav>

      {/* HERO */}
      <div style={{position:"relative",height:"100vh",minHeight:550,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <img src={I.terrace} alt="Caonabo 35" fetchpriority="high" decoding="async" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(160deg,rgba(26,15,8,.78),rgba(42,31,22,.5) 50%,rgba(26,15,8,.8))"}}/>
        <div style={{position:"relative",textAlign:"center",padding:"2rem"}} className="fadein">
          <p style={{color:C.gold,fontSize:".68rem",letterSpacing:".38em",fontFamily:"'Lato',sans-serif",textTransform:"uppercase",marginBottom:"1.4rem"}}>Av. Caonabo #35, 2do Piso · Santo Domingo</p>
          <h1 style={{color:C.ivory,fontSize:"clamp(3.2rem,8vw,6.5rem)",fontWeight:300,letterSpacing:".06em",lineHeight:.92,marginBottom:".75rem"}}>Caonabo <em style={{color:C.goldLight,fontStyle:"italic"}}>35</em></h1>
          <p style={{color:C.sand,fontSize:"clamp(.9rem,2vw,1.05rem)",fontStyle:"italic",maxWidth:500,margin:"0 auto 2.5rem",lineHeight:1.9}}>{settings.heroSubtitle}</p>
          <div style={{display:"flex",gap:"1rem",justifyContent:"center",flexWrap:"wrap",marginBottom:"5rem"}}>
            <button className="btn-gold" onClick={()=>document.getElementById("rooms")?.scrollIntoView({behavior:"smooth"})}>{t("VER HABITACIONES","VIEW ROOMS")}</button>
            <a href={`https://wa.me/${settings.whatsapp}`} style={{textDecoration:"none"}} target="_blank" rel="noopener"><button className="btn-out">WHATSAPP</button></a>
          </div>
          <div style={{display:"flex",gap:"3.5rem",justifyContent:"center",flexWrap:"wrap"}}>
            {[["7",t("Habitaciones","Rooms")],["4.9",t("Estrellas","Stars")],["100+",t("Huéspedes","Guests")],["24/7",t("Servicio","Service")]].map(([n,l])=>(
              <div key={l}><div style={{color:C.gold,fontSize:"2rem",fontWeight:600,lineHeight:1}}>{n}</div><div style={{color:C.taupe,fontSize:".65rem",fontFamily:"'Lato',sans-serif",letterSpacing:".18em",textTransform:"uppercase",marginTop:".28rem"}}>{l}</div></div>
            ))}
          </div>
        </div>
        <div style={{position:"absolute",bottom:"1.5rem",left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:".3rem",cursor:"pointer",opacity:.7}} onClick={()=>document.getElementById("rooms")?.scrollIntoView({behavior:"smooth"})}>
          <span style={{color:C.taupe,fontSize:".6rem",fontFamily:"'Lato',sans-serif",letterSpacing:".2em",textTransform:"uppercase"}}>scroll</span>
          <div style={{width:1,height:30,background:`linear-gradient(${C.gold},transparent)`}}/>
        </div>
      </div>

      {/* PHOTO STRIP */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",height:220}}>
        {[I.livingBig,I.reception,I.corridor,I.amberChairs].map((src,i)=>(
          <div key={i} style={{overflow:"hidden",cursor:"pointer"}} onClick={()=>document.getElementById("gallery")?.scrollIntoView({behavior:"smooth"})}>
            <img src={src} alt="" loading="lazy" decoding="async" style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform .5s"}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.05)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>
          </div>
        ))}
      </div>

      {/* ROOMS */}
      <div id="rooms" style={{background:C.ivory,padding:"5.5rem 2rem"}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <SHead eyebrow={t("ALOJAMIENTO","ACCOMMODATION")} title={t("Nuestras Habitaciones","Our Rooms")}/>

          {/* ── Availability Checker ── */}
          <div style={{background:C.ebony,padding:"1.75rem 2rem",marginBottom:"2.5rem",borderTop:`3px solid ${C.gold}`}}>
            <p style={{color:C.gold,fontSize:".63rem",fontFamily:"'Lato',sans-serif",letterSpacing:".28em",textTransform:"uppercase",textAlign:"center",marginBottom:"1.1rem"}}>{t("VERIFICAR DISPONIBILIDAD","CHECK AVAILABILITY")}</p>
            <div style={{display:"flex",gap:"1rem",alignItems:"flex-end",flexWrap:"wrap",justifyContent:"center"}}>
              <div>
                <label style={{display:"block",color:C.taupe,fontSize:".62rem",fontFamily:"'Lato',sans-serif",letterSpacing:".15em",textTransform:"uppercase",marginBottom:".35rem"}}>{t("Llegada","Check-in")}</label>
                <input type="date" min={new Date().toISOString().slice(0,10)} value={availDates.checkIn}
                  onChange={e=>{setAvailDates(d=>({...d,checkIn:e.target.value}));setBookedRoomIds(null);}}
                  style={{background:C.mahogany,border:`1px solid ${C.gold}40`,color:C.ivory,padding:".65rem 1rem",fontFamily:"'Lato',sans-serif",fontSize:".87rem",outline:"none",colorScheme:"dark"}}/>
              </div>
              <div>
                <label style={{display:"block",color:C.taupe,fontSize:".62rem",fontFamily:"'Lato',sans-serif",letterSpacing:".15em",textTransform:"uppercase",marginBottom:".35rem"}}>{t("Salida","Check-out")}</label>
                <input type="date" min={availDates.checkIn||new Date().toISOString().slice(0,10)} value={availDates.checkOut}
                  onChange={e=>{setAvailDates(d=>({...d,checkOut:e.target.value}));setBookedRoomIds(null);}}
                  style={{background:C.mahogany,border:`1px solid ${C.gold}40`,color:C.ivory,padding:".65rem 1rem",fontFamily:"'Lato',sans-serif",fontSize:".87rem",outline:"none",colorScheme:"dark"}}/>
              </div>
              <button className="btn-gold" style={{padding:".72rem 2rem",fontSize:".75rem",letterSpacing:".12em",opacity:availDates.checkIn&&availDates.checkOut&&availDates.checkIn<availDates.checkOut?1:.45}}
                onClick={checkAvailability} disabled={availLoading||!availDates.checkIn||!availDates.checkOut||availDates.checkIn>=availDates.checkOut}>
                {availLoading?t("Buscando...","Searching..."):t("BUSCAR HABITACIÓN","SEARCH")}
              </button>
            </div>
            {bookedRoomIds!==null&&(
              <p style={{textAlign:"center",marginTop:"1rem",fontFamily:"'Lato',sans-serif",fontSize:".82rem",color:C.taupe}}>
                {bookedRoomIds.length===0
                  ?t("✓ Todas las habitaciones están disponibles para esas fechas.","✓ All rooms are available for those dates.")
                  :`${rooms.length-bookedRoomIds.length} de ${rooms.length} ${t("habitaciones disponibles para esas fechas","rooms available for those dates")}`
                }
              </p>
            )}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:"1.5rem"}}>
            {(()=>{const _tod=new Date();const todaySeason=seasons.find(s=>{const y=_tod.getFullYear();const sStart=new Date(`${parseInt(s.startMonth)>parseInt(s.endMonth)?y-1:y}-${s.startMonth}-${s.startDay}`);const sEnd=new Date(`${y}-${s.endMonth}-${s.endDay}`);return _tod>=sStart&&_tod<=sEnd;});return rooms.map(room=>(
              <div key={room.id} className="room-card">
                <div style={{height:245,position:"relative",overflow:"hidden",cursor:"pointer"}} onClick={()=>setRoomLightbox({photos:roomPhotos(room),name:lang==="es"?room.name:room.nameEn,idx:0})}>
                  <img src={coverPhoto(room)} alt={room.name} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform .5s"}}/>
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(26,15,8,.85) 0%,transparent 55%)"}}/>
                  <div className="rm-ovr" style={{position:"absolute",inset:0,background:"rgba(26,15,8,.65)",display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity .3s"}}>
                    {(()=>{const un=roomAvail[room.id]===false||!room.available||(bookedRoomIds!==null&&bookedRoomIds.includes(room.id));return(<button className="btn-gold" onClick={e=>{e.stopPropagation();if(!un){setSelRoom(room.id);setBookModal(true);setBookError("");if(availDates.checkIn)setBookForm(f=>({...f,checkIn:availDates.checkIn,checkOut:availDates.checkOut}));}}}>{un?t("NO DISPONIBLE","UNAVAILABLE"):t("RESERVAR","BOOK NOW")}</button>);})()}
                  </div>
                  {(()=>{ const chkUnavail=roomAvail[room.id]===false||(bookedRoomIds!==null&&bookedRoomIds.includes(room.id)); return(<div style={{position:"absolute",top:"1rem",right:"1rem",background:chkUnavail?C.danger:room.available?C.gold:"#666",color:chkUnavail||!room.available?"#fff":C.ebony,padding:".2rem .85rem",fontSize:".64rem",fontFamily:"'Lato',sans-serif",fontWeight:700,letterSpacing:".1em"}}>{chkUnavail?t("NO DISPONIBLE","UNAVAILABLE"):room.available?t("DISPONIBLE","AVAILABLE"):t("OCUPADA","OCCUPIED")}</div>);})()}
                  <div style={{position:"absolute",bottom:"1.25rem",left:"1.5rem"}}>
                    <div style={{color:C.ivory,fontSize:"1.25rem",fontWeight:500}}>{lang==="es"?room.name:room.nameEn}</div>
                    <div style={{color:C.goldLight,fontSize:".71rem",fontFamily:"'Lato',sans-serif",letterSpacing:".1em",marginTop:".18rem"}}>{room.size} · {room.beds}</div>
                  </div>
                </div>
                <div style={{padding:"1.4rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:".9rem"}}>
                    <div style={{display:"flex",flexDirection:"column",gap:".1rem"}}>{room.discount>0&&<span style={{fontFamily:"'Lato',sans-serif",fontSize:".73rem",color:C.taupe,textDecoration:"line-through"}}>{"$"+room.price+"/"+t("noche","night")}</span>}<div><span style={{fontSize:"1.65rem",fontWeight:600,color:room.discount>0?C.gold:C.warm}}>{"$"+(room.discount>0?Math.round(room.price*(1-room.discount/100)):room.price)}</span><span style={{color:C.taupe,fontSize:".78rem",fontFamily:"'Lato',sans-serif"}}> /{t("noche","night")}</span>{room.discount>0&&<span style={{background:C.gold,color:C.ebony,fontSize:".62rem",fontWeight:700,padding:".1rem .35rem",marginLeft:".4rem",fontFamily:"'Lato',sans-serif"}}>{"- "+room.discount+"%"}</span>}</div></div>
                    <span style={{color:C.taupe,fontSize:".78rem",fontFamily:"'Lato',sans-serif"}}>{t(`Hasta ${room.guests} hués.`,`Up to ${room.guests} guests`)}</span>
                  </div>
                  <p style={{color:C.taupe,fontFamily:"'Lato',sans-serif",fontSize:".82rem",lineHeight:1.6,marginBottom:".9rem",fontStyle:"italic"}}>{room.desc}</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:".35rem",marginBottom:"1.1rem"}}>
                    {room.amenities.map(a=><span key={a} style={{background:C.smoke,color:C.warm,padding:".18rem .72rem",fontSize:".68rem",fontFamily:"'Lato',sans-serif",borderRadius:20}}>{a}</span>)}
                  </div>
                  {todaySeason&&<div style={{background:C.gold,color:C.ebony,fontFamily:"'Lato',sans-serif",fontSize:".63rem",fontWeight:700,padding:".15rem .55rem",display:"inline-block",marginBottom:".5rem",letterSpacing:".05em"}}>🌡️ {todaySeason.name} +{todaySeason.pct}%</div>}
                  {(()=>{const un=roomAvail[room.id]===false||!room.available||(bookedRoomIds!==null&&bookedRoomIds.includes(room.id));return(<button className="btn-gold" style={{width:"100%",opacity:un?.4:1,cursor:un?"not-allowed":"pointer"}} onClick={()=>{if(!un){setSelRoom(room.id);setBookModal(true);setBookError("");if(availDates.checkIn)setBookForm(f=>({...f,checkIn:availDates.checkIn,checkOut:availDates.checkOut}));}}}>{un?t("NO DISPONIBLE","NOT AVAILABLE"):t("RESERVAR AHORA","BOOK NOW")}</button>);})()}
                </div>
              </div>
            ));})()}
          </div>
        </div>
      </div>

      {/* GALLERY */}
      <div id="gallery" style={{background:C.ebony,padding:"5.5rem 2rem"}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <SHead eyebrow={t("FOTOGRAFÍA","PHOTOGRAPHY")} title={t("Galería","Gallery")} dark/>
          <div style={{display:"flex",gap:".5rem",justifyContent:"center",flexWrap:"wrap",marginBottom:"2.5rem"}}>
            {[["all",t("Todo","All")],["outdoor",t("Exterior","Outdoor")],["living",t("Salas","Living")],["bedroom",t("Habitaciones","Rooms")],["bathroom","Baños"],["common",t("Áreas Comunes","Common")],["detail",t("Detalles","Details")]].map(([f,l])=>(
              <button key={f} className={`tog${galFilter===f?" act":""}`} onClick={()=>setGalFilter(f)}>{l}</button>
            ))}
          </div>
          <div style={{columns:"3 240px",gap:5,lineHeight:0}}>
            {galItems.map((g,i)=>{
              const realIdx=GALLERY.indexOf(g);
              return(
                <div key={i} className="gal-item" style={{breakInside:"avoid",marginBottom:5,display:"block",position:"relative"}} onClick={()=>setGalOpen(realIdx)}>
                  <img src={g.photo} alt={g.label} loading="lazy" decoding="async" style={{width:"100%",height:g.featured?300:180,objectFit:"cover",display:"block"}}/>
                  <div className="gal-cap" style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(26,15,8,.7))",padding:".85rem .9rem",opacity:0,transition:"opacity .3s"}}>
                    <span style={{color:C.parchment,fontSize:".7rem",fontFamily:"'Lato',sans-serif",letterSpacing:".1em",textTransform:"uppercase"}}>{g.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AMENITIES */}
      <div id="amenities" style={{background:C.ivory,padding:"5.5rem 2rem"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <SHead eyebrow={t("INSTALACIONES","FACILITIES")} title={t("Servicios & Amenidades","Services & Amenities")}/>
          {["Espacios","Servicios"].map(cat=>(
            <div key={cat} style={{marginBottom:"3rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:"1.4rem",marginBottom:"1px"}}>
                <span style={{color:C.gold,fontSize:".63rem",fontFamily:"'Lato',sans-serif",letterSpacing:".28em",textTransform:"uppercase",flexShrink:0}}>{cat}</span>
                <div style={{flex:1,height:1,background:`linear-gradient(90deg,${C.gold}60,transparent)`}}/>
              </div>
              <div style={{border:`1px solid ${C.parchment}`}}>
                {AMENITIES.filter(a=>a.cat===cat).map((item,ii,arr)=>(
                  <div key={item.name} className="am-row" style={{borderBottom:ii<arr.length-1?`1px solid ${C.parchment}`:"none"}} onClick={()=>setAmenModal(item)}>
                    <div style={{width:56,height:56,overflow:"hidden",flexShrink:0}}><img src={item.photo} alt={item.name} loading="lazy" decoding="async" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"1rem",fontWeight:500,color:C.ebony,marginBottom:".15rem"}}>{lang==="es"?item.name:item.nameEn}</div>
                      <div style={{fontSize:".79rem",color:C.taupe,fontFamily:"'Lato',sans-serif",fontStyle:"italic",lineHeight:1.5}}>{item.desc.split(".")[0]}.</div>
                    </div>
                    <span className="am-arr" style={{color:C.gold,fontSize:"1.1rem",opacity:.2,transition:"all .2s",flexShrink:0}}>›</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* REVIEWS */}
      <div style={{background:C.parchment,padding:"5rem 2rem"}}>
        <div style={{maxWidth:1000,margin:"0 auto"}}>
          <SHead eyebrow={t("TESTIMONIOS","TESTIMONIALS")} title={t("Lo Que Dicen Nuestros Huéspedes","What Our Guests Say")}/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(400px,1fr))",gap:"1.5rem"}}>
            {(()=>{
              // Real verified reviews first, then sample testimonials fill up to 6 — as real ones
              // accumulate they push the samples out (samples stay in code as filler for now).
              const real=dbReviews.filter(r=>r.approved).map(r=>({rating:r.rating,text:r.body,guest:r.name,country:t("✓ Estadía verificada","✓ Verified stay"),date:r.created_at?r.created_at.slice(0,10):""}));
              const samples=reviews.filter(r=>r.approved);
              return [...real,...samples].slice(0,6).map((r,i)=>(
                <div key={i} style={{background:C.white,padding:"2rem 2.2rem",borderTop:`3px solid ${C.gold}`}}>
                  <div style={{color:C.gold,letterSpacing:3,marginBottom:".9rem",fontSize:".86rem"}}>{"★".repeat(r.rating)}</div>
                  <p style={{color:C.ebony,lineHeight:1.85,fontSize:".95rem",fontStyle:"italic",marginBottom:"1.2rem"}}>"{r.text}"</p>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"'Lato',sans-serif"}}>
                    <div><span style={{fontWeight:700,color:C.mahogany,fontSize:".82rem"}}>{r.guest}</span><span style={{color:C.taupe,fontSize:".75rem",marginLeft:".5rem"}}>{r.country}</span></div>
                    <span style={{color:C.taupe,fontSize:".73rem"}}>{r.date}</span>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* CONTACT */}
      <div id="contact" style={{background:C.ebony,padding:"5.5rem 2rem"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <SHead eyebrow="CONTACTO" title={t("Encuéntranos","Find Us")} dark/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1.7fr",gap:"3.5rem",alignItems:"start"}} className="mob-full mob-stack">
            <div>
              {[[t("Dirección","Address"),settings.address,"https://maps.google.com/?q=Caonabo+35+Santo+Domingo"],["WhatsApp & Teléfono",settings.phone,`https://wa.me/${settings.whatsapp}`],[t("Correo Electrónico","Email"),settings.email,`mailto:${settings.email}`],[t("Check-in / Check-out","Check-in / Check-out"),`${settings.checkIn} / ${settings.checkOut}`,null],["Instagram",settings.instagram,`https://instagram.com/${settings.instagram.replace("@","")}`]].map(([l,v,href])=>(
                <div key={l} style={{borderBottom:`1px solid ${C.mahogany}55`,padding:"1.15rem 0"}}>
                  <div style={{color:C.gold,fontSize:".62rem",fontFamily:"'Lato',sans-serif",letterSpacing:".2em",textTransform:"uppercase",marginBottom:".35rem"}}>{l}</div>
                  {href?<a href={href} target="_blank" rel="noopener" style={{color:C.parchment,textDecoration:"none",fontFamily:"'Lato',sans-serif",fontSize:".88rem",lineHeight:1.6,whiteSpace:"pre-line"}}>{v}</a>:<p style={{color:C.parchment,fontFamily:"'Lato',sans-serif",fontSize:".88rem",lineHeight:1.6,whiteSpace:"pre-line"}}>{v}</p>}
                </div>
              ))}
              <div style={{display:"flex",flexDirection:"column",gap:".7rem",marginTop:"1.6rem"}}>
                <a href={`https://wa.me/${settings.whatsapp}`} style={{textDecoration:"none"}} target="_blank" rel="noopener"><button className="btn-gold" style={{width:"100%"}}>📱 {t("ESCRIBIR POR WHATSAPP","WHATSAPP US")}</button></a>
                <a href={`mailto:${settings.email}`} style={{textDecoration:"none"}}><button className="btn-out" style={{width:"100%"}}>✉️ {t("ENVIAR EMAIL","SEND EMAIL")}</button></a>
              </div>
            </div>
            <div>
              <div style={{position:"relative",paddingBottom:"58%",height:0,overflow:"hidden",border:`1px solid ${C.mahogany}`}}>
                <iframe title="Caonabo 35 Mapa" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3784.123!2d-69.9670143!3d18.4472324!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTjCsDI2JzUwLjAiTiA2OcKwNTgnMDEuMyJX!5e0!3m2!1ses!2sdo!4v1711000000000" style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:0}} allowFullScreen loading="lazy"/>
              </div>
              <a href="https://maps.google.com/?q=18.4472324,-69.9670143" target="_blank" rel="noopener" style={{textDecoration:"none"}}>
                <button className="btn-out" style={{width:"100%",marginTop:".7rem"}}>📍 {t("ABRIR EN GOOGLE MAPS","OPEN IN GOOGLE MAPS")}</button>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{background:"#1A0F08",padding:"2.25rem 2rem",textAlign:"center",borderTop:`1px solid ${C.mahogany}40`}}>
        <div style={{color:C.gold,fontSize:"1.35rem",fontWeight:600,letterSpacing:".12em",marginBottom:".38rem"}}>CAONABO 35</div>
        <p style={{color:C.taupe,fontFamily:"'Lato',sans-serif",fontSize:".74rem",letterSpacing:".07em",marginBottom:"1.1rem"}}>{t("Av. Caonabo #35, 2do Piso · Santo Domingo, R.D.","Av. Caonabo #35, 2nd Floor · Santo Domingo, D.R.")}</p>
        <div style={{display:"flex",gap:"2rem",justifyContent:"center",flexWrap:"wrap",marginBottom:".9rem"}}>
          <a href={`https://wa.me/${settings.whatsapp}`} style={{color:C.taupe,fontFamily:"'Lato',sans-serif",fontSize:".74rem",textDecoration:"none"}}>{settings.phone}</a>
          <a href={`mailto:${settings.email}`} style={{color:C.taupe,fontFamily:"'Lato',sans-serif",fontSize:".74rem",textDecoration:"none"}}>{settings.email}</a>
          <a href={`https://instagram.com/${settings.instagram.replace("@","")}`} style={{color:C.taupe,fontFamily:"'Lato',sans-serif",fontSize:".74rem",textDecoration:"none"}}>{settings.instagram}</a>
        </div>
        <p style={{color:"#3D2B1F",fontFamily:"'Lato',sans-serif",fontSize:".67rem"}}>© 2026 Caonabo 35 · {t("Todos los derechos reservados","All rights reserved")} · <button onClick={()=>setShowPrivacy(true)} style={{background:"none",border:"none",color:"#5a3e2b",fontFamily:"'Lato',sans-serif",fontSize:".67rem",cursor:"pointer",textDecoration:"underline",padding:0}}>{t("Política de Privacidad","Privacy Policy")}</button></p>
      </footer>

      {/* Floating WhatsApp booking CTA — the DR checkout counter, always one tap away */}
      <a href={`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(t("¡Hola! Quiero reservar en Caonabo 35.","Hi! I'd like to book at Caonabo 35."))}`} target="_blank" rel="noopener"
         aria-label="WhatsApp"
         style={{position:"fixed",bottom:"1.3rem",right:"1.3rem",zIndex:3000,display:"flex",alignItems:"center",gap:".5rem",background:"#25D366",color:"#fff",padding:".72rem 1.15rem",borderRadius:"999px",fontFamily:"'Lato',sans-serif",fontWeight:700,fontSize:".82rem",textDecoration:"none",boxShadow:"0 6px 22px rgba(0,0,0,.3)"}}>
        <svg width="20" height="20" viewBox="0 0 32 32" fill="#fff"><path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.7 5.4 2 7.7L.5 31.5l8-2.1c2.2 1.2 4.8 1.9 7.5 1.9 8.6 0 15.5-6.9 15.5-15.5S24.6.5 16 .5zm0 28.3c-2.4 0-4.7-.7-6.7-1.9l-.5-.3-4.7 1.2 1.3-4.6-.3-.5c-1.3-2.1-2-4.5-2-7 0-7.2 5.9-13.1 13.1-13.1S29.1 8.8 29.1 16 23.2 28.8 16 28.8zm7.2-9.8c-.4-.2-2.3-1.1-2.7-1.3-.4-.1-.6-.2-.9.2-.3.4-1 1.3-1.2 1.5-.2.2-.4.3-.8.1-.4-.2-1.7-.6-3.2-2-1.2-1.1-2-2.4-2.2-2.8-.2-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.2-.4.4-.7.1-.2.1-.5 0-.7-.1-.2-.9-2.1-1.2-2.9-.3-.7-.6-.6-.9-.6h-.7c-.2 0-.6.1-1 .5-.3.4-1.3 1.3-1.3 3.1s1.3 3.6 1.5 3.9c.2.2 2.6 4 6.3 5.6.9.4 1.6.6 2.1.8.9.3 1.7.2 2.3.1.7-.1 2.3-.9 2.6-1.8.3-.9.3-1.6.2-1.8-.1-.1-.3-.2-.7-.4z"/></svg>
        <span className="wa-label">{t("Reservar por WhatsApp","Book on WhatsApp")}</span>
      </a>

      {/* ── PUBLIC MODALS ── */}

      {/* Verified-review submission (opened by the ?rev=<bookingId> link in the post-stay email) */}
      {reviewParam&&(()=>{
        const close=()=>{setReviewParam(null);try{window.history.replaceState({},"",window.location.pathname);}catch{}};
        return(
        <Backdrop onClose={close}>
          <ModalBox>
            <ModalHdr title={t("Tu reseña","Your review")} sub="CAONABO 35" onClose={close}/>
            <div style={{padding:"1.5rem 2rem"}}>
              {reviewForm.done
                ? <p style={{textAlign:"center",color:C.ebony,fontSize:"1rem",padding:"1.4rem 0",lineHeight:1.6}}>{t("¡Gracias por tu reseña! 🙏 La revisaremos y publicaremos pronto.","Thank you for your review! 🙏 We'll review and publish it soon.")}</p>
                : (<>
                  {reviewForm.err&&<div className="error-banner">{reviewForm.err}</div>}
                  <p style={{fontFamily:"'Lato',sans-serif",fontSize:".85rem",color:C.taupe,marginBottom:".9rem"}}>{t("¿Cómo estuvo tu estadía en Caonabo 35?","How was your stay at Caonabo 35?")}</p>
                  <div style={{textAlign:"center",marginBottom:"1rem",fontSize:"2rem",letterSpacing:6}}>
                    {[1,2,3,4,5].map(n=><span key={n} onClick={()=>setReviewForm(f=>({...f,rating:n}))} style={{color:n<=reviewForm.rating?C.gold:C.sand,cursor:"pointer"}}>★</span>)}
                  </div>
                  <textarea value={reviewForm.body} onChange={e=>setReviewForm(f=>({...f,body:e.target.value}))} placeholder={t("Cuéntanos cómo estuvo tu estadía…","Tell us about your stay…")} style={{width:"100%",height:110,padding:".8rem",border:`1px solid ${C.sand}`,fontFamily:"'Lato',sans-serif",fontSize:".9rem",background:C.smoke,color:C.ebony,resize:"vertical",marginBottom:"1rem",outline:"none"}}/>
                  <button className="btn-gold" style={{width:"100%"}} onClick={async()=>{
                    if(!reviewForm.body.trim()){setReviewForm(f=>({...f,err:t("Escribe algo, por favor.","Please write something.")}));return;}
                    try{
                      const res=await fetch('/api/submit-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bookingId:reviewParam,rating:reviewForm.rating,body:reviewForm.body})});
                      const j=await res.json().catch(()=>({}));
                      if(!res.ok){setReviewForm(f=>({...f,err:j.error||"Error"}));return;}
                      setReviewForm(f=>({...f,done:true,err:""}));
                    }catch(e){setReviewForm(f=>({...f,err:e.message}));}
                  }}>{t("Enviar reseña","Submit review")}</button>
                </>)}
            </div>
          </ModalBox>
        </Backdrop>
        );
      })()}

      {/* Booking modal with price breakdown + conflict protection */}
      {bookModal&&(()=>{
        const rm=rooms.find(r=>r.id===selRoom);
        const pricing=bookForm.checkIn&&bookForm.checkOut&&bookForm.checkIn<bookForm.checkOut?calcPrice(rm?.price||0,bookForm.checkIn,bookForm.checkOut,null,seasons,rm?.id):null;
        return(
          <Backdrop onClose={()=>{setBookModal(false);setBookError("");}}>
            <ModalBox>
              <div style={{height:170,position:"relative",overflow:"hidden"}}>
                <img src={coverPhoto(rm)} alt="" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(26,15,8,.85),transparent 40%)"}}/>
                <div style={{position:"absolute",bottom:"1.25rem",left:"1.75rem"}}>
                  <div style={{color:C.gold,fontSize:".62rem",fontFamily:"'Lato',sans-serif",letterSpacing:".2em",textTransform:"uppercase"}}>{t("SOLICITAR RESERVA","REQUEST BOOKING")}</div>
                  <div style={{color:C.ivory,fontSize:"1.35rem",fontWeight:500,marginTop:".18rem"}}>{lang==="es"?rm?.name:rm?.nameEn}</div>
                </div>
                <button onClick={()=>{setBookModal(false);setBookError("");}} style={{position:"absolute",top:".85rem",right:".85rem",background:"rgba(26,15,8,.6)",border:"none",color:"#fff",fontSize:"1.6rem",cursor:"pointer",width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%"}}>×</button>
              </div>
              <div style={{padding:"1.5rem 1.75rem"}}>
                {bookError&&<div className="error-banner">{bookError}</div>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                  <div style={{gridColumn:"1/-1"}}><FL>{t("Nombre Completo","Full Name")} *</FL><Inp value={bookForm.name||""} onChange={e=>setBookForm({...bookForm,name:e.target.value})}/></div>
                  <div><FL>{t("WhatsApp / Teléfono","WhatsApp / Phone")} *</FL><Inp type="tel" value={bookForm.phone||""} onChange={e=>setBookForm({...bookForm,phone:e.target.value})}/></div>
                  <div><FL>Email</FL><Inp type="email" value={bookForm.email||""} onChange={e=>setBookForm({...bookForm,email:e.target.value})}/></div>
                  <div><FL>{t("Tipo de ID","ID Type")} *</FL><Sel value={bookForm.idType} onChange={e=>setBookForm({...bookForm,idType:e.target.value})}><option value="cedula">{t("Cédula Dominicana","Dominican Cédula")}</option><option value="passport">{t("Pasaporte","Passport")}</option></Sel></div>
                  <div><FL>{bookForm.idType==='cedula'?t("Número de Cédula","Cédula Number"):t("Número de Pasaporte","Passport Number")} *</FL><Inp value={bookForm.idNumber||""} placeholder={bookForm.idType==='cedula'?"001-0000000-0":"AB123456"} onChange={e=>setBookForm({...bookForm,idNumber:e.target.value})}/></div>
                  <div style={{gridColumn:"1/-1"}}>
                    <FL>{t("Foto de Cédula / Pasaporte","Photo of ID / Passport")} *</FL>
                    <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:".5rem",padding:"1.2rem",border:`2px dashed ${bookForm.idPhotoFile?C.olive:C.sand}`,borderRadius:8,background:bookForm.idPhotoFile?"#F1F8E9":C.smoke,cursor:"pointer",fontFamily:"'Lato',sans-serif",transition:"all .2s"}}>
                      <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f)setBookForm(prev=>({...prev,idPhotoFile:f}));}}/>
                      {bookForm.idPhotoFile
                        ?<><div style={{fontSize:"1.8rem"}}>✅</div><div style={{fontSize:".82rem",fontWeight:700,color:C.olive}}>{bookForm.idPhotoFile.name}</div><div style={{fontSize:".72rem",color:C.taupe}}>{t("Toca para cambiar","Tap to change")}</div></>
                        :<><div style={{fontSize:"1.8rem"}}>📷</div><div style={{fontSize:".85rem",fontWeight:700,color:C.ebony}}>{t("Tomar foto o subir archivo","Take photo or upload file")}</div><div style={{fontSize:".72rem",color:C.taupe}}>{t("Cédula o pasaporte (requerido)","ID or passport (required)")}</div></>
                      }
                    </label>
                  </div>
                  <div><FL>{t("Fecha Entrada","Check-in")} *</FL><Inp type="date" value={bookForm.checkIn||""} onChange={e=>setBookForm({...bookForm,checkIn:e.target.value})}/></div>
                  <div><FL>{t("Fecha Salida","Check-out")} *</FL><Inp type="date" value={bookForm.checkOut||""} onChange={e=>setBookForm({...bookForm,checkOut:e.target.value})}/></div>
                  <div><FL>{t("Huéspedes","Guests")}</FL><Sel value={bookForm.guests} onChange={e=>setBookForm({...bookForm,guests:e.target.value})}>{[1,2,3,4].map(n=><option key={n} value={n}>{n} {n===1?t("persona","person"):t("personas","people")}</option>)}</Sel></div>
                  <div style={{gridColumn:"1/-1"}}><FL>{t("Notas / Solicitudes especiales","Notes / Special requests")}</FL><textarea value={bookForm.notes||""} onChange={e=>setBookForm({...bookForm,notes:e.target.value})} style={{width:"100%",padding:".7rem 1rem",border:`1px solid ${C.sand}`,fontFamily:"'Lato',sans-serif",fontSize:".88rem",background:C.smoke,height:60,resize:"vertical",outline:"none",color:C.ebony}}/></div>
                </div>
                {pricing&&(
                  <div className="price-breakdown">
                    <div className="price-row"><span style={{color:C.taupe}}>${rm?.price} × {pricing.nights} {t("noches","nights")}</span><span>{fmtMoney(pricing.subtotal)}</span></div>
                    
                    <div className="price-row total"><span style={{color:C.ebony}}>Total estimado</span><span style={{color:C.warm}}>{fmtMoney(pricing.total)}</span></div>
                    <div style={{fontFamily:"'Lato',sans-serif",fontSize:".7rem",color:C.taupe,marginTop:".4rem",fontStyle:"italic"}}>*Sujeto a confirmación por WhatsApp</div>
                  </div>
                )}
                <label style={{display:"flex",alignItems:"flex-start",gap:".6rem",fontFamily:"'Lato',sans-serif",fontSize:".78rem",color:C.ebony,marginBottom:"1rem",cursor:"pointer"}}>
                  <input type="checkbox" required checked={bookForm.privacyAccepted||false} onChange={e=>setBookForm(p=>({...p,privacyAccepted:e.target.checked}))} style={{marginTop:".15rem",accentColor:C.gold}}/>
                  <span>{t("Acepto la","I accept the")} <button type="button" onClick={()=>setShowPrivacy(true)} style={{background:"none",border:"none",color:C.gold,textDecoration:"underline",cursor:"pointer",padding:0,fontFamily:"inherit",fontSize:"inherit"}}>{t("Política de Privacidad","Privacy Policy")}</button></span>
                </label>
                <button className="btn-gold" style={{width:"100%",marginTop:".75rem"}} onClick={submitBooking}>{t("ENVIAR SOLICITUD","SUBMIT REQUEST")}</button>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".72rem",color:C.taupe,textAlign:"center",marginTop:".85rem",lineHeight:1.7}}>
                  💳 {t("Pago: efectivo o transferencia al llegar","Payment: cash or transfer on arrival")}<br/>
                  ↩️ {t("Cancelación gratuita con 48h de anticipación","Free cancellation with 48h notice")}
                </p>
              </div>
            </ModalBox>
          </Backdrop>
        );
      })()}

      {/* Gallery lightbox */}
      {galOpen!==null&&(
        <div style={{position:"fixed",inset:0,background:"rgba(26,15,8,.97)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setGalOpen(null)}>
          <div style={{position:"relative",maxWidth:950,width:"95%"}} onClick={e=>e.stopPropagation()}>
            <div style={{position:"relative",maxHeight:"70vh",overflow:"hidden"}}>
              <img src={GALLERY[galOpen]?.photo} alt={GALLERY[galOpen]?.label} style={{width:"100%",maxHeight:"70vh",objectFit:"contain",display:"block"}}/>
              <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(26,15,8,.75))",padding:"2rem 1.5rem 1.25rem"}}>
                <div style={{color:C.goldLight,fontSize:"1.1rem",fontWeight:300}}>{GALLERY[galOpen]?.label}</div>
                <div style={{color:C.taupe,fontFamily:"'Lato',sans-serif",fontSize:".68rem",letterSpacing:".15em",textTransform:"uppercase",marginTop:".18rem"}}>Caonabo 35 · {galOpen+1}/{GALLERY.length}</div>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:".85rem"}}>
              <button className="btn-out" style={{padding:".55rem 1.3rem"}} onClick={()=>setGalOpen((galOpen-1+GALLERY.length)%GALLERY.length)}>← Anterior</button>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",maxWidth:300}}>
                {GALLERY.map((_,i)=><div key={i} onClick={()=>setGalOpen(i)} style={{width:6,height:6,borderRadius:"50%",background:i===galOpen?C.gold:C.mahogany,cursor:"pointer"}}/>)}
              </div>
              <button className="btn-out" style={{padding:".55rem 1.3rem"}} onClick={()=>setGalOpen((galOpen+1)%GALLERY.length)}>Siguiente →</button>
            </div>
          </div>
          <button onClick={()=>setGalOpen(null)} style={{position:"fixed",top:"1rem",right:"1rem",background:"rgba(42,31,22,.7)",border:`1px solid ${C.mahogany}`,color:C.taupe,fontSize:"1.5rem",cursor:"pointer",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%"}}>×</button>
        </div>
      )}

      {/* Room photo lightbox */}
      {roomLightbox!==null&&(()=>{
        const gallery=roomLightbox.photos||[];
        const photos=gallery.map(g=>g.url);
        const labels=gallery.map(g=>g.label);
        const idx=roomLightbox.idx||0;
        return(
          <div style={{position:"fixed",inset:0,background:"rgba(26,15,8,.97)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setRoomLightbox(null)}>
            <div style={{position:"relative",maxWidth:950,width:"95%"}} onClick={e=>e.stopPropagation()}>
              <div style={{position:"relative",maxHeight:"70vh",overflow:"hidden"}}>
                <img src={photos[idx]} alt={labels[idx]} style={{width:"100%",maxHeight:"70vh",objectFit:"contain",display:"block"}}/>
                <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(26,15,8,.75))",padding:"2rem 1.5rem 1.25rem"}}>
                  <div style={{color:C.goldLight,fontSize:"1.1rem",fontWeight:300}}>{roomLightbox.name} — {labels[idx]}</div>
                  <div style={{color:C.taupe,fontFamily:"'Lato',sans-serif",fontSize:".68rem",letterSpacing:".15em",textTransform:"uppercase",marginTop:".18rem"}}>Caonabo 35 · {idx+1}/{photos.length}</div>
                </div>
              </div>
              {photos.length>1&&(<>
                {/* Prev/next sit on the image so the gallery works with any number of photos */}
                <button aria-label="Anterior" onClick={()=>setRoomLightbox({...roomLightbox,idx:(idx-1+photos.length)%photos.length})}
                  style={lightboxArrow("left")}>‹</button>
                <button aria-label="Siguiente" onClick={()=>setRoomLightbox({...roomLightbox,idx:(idx+1)%photos.length})}
                  style={lightboxArrow("right")}>›</button>
                <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:".4rem",marginTop:".85rem",flexWrap:"wrap",maxHeight:100,overflowY:"auto"}}>
                  {photos.map((src,i)=>(
                    <button key={i} aria-label={labels[i]} onClick={()=>setRoomLightbox({...roomLightbox,idx:i})}
                      style={{width:62,height:44,padding:0,border:`2px solid ${i===idx?C.gold:"transparent"}`,
                              opacity:i===idx?1:0.55,background:"none",cursor:"pointer",flex:"0 0 auto"}}>
                      <img src={src} alt="" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                    </button>
                  ))}
                </div>
              </>)}
            </div>
            <button onClick={()=>setRoomLightbox(null)} style={{position:"fixed",top:"1rem",right:"1rem",background:"rgba(42,31,22,.7)",border:`1px solid ${C.mahogany}`,color:C.taupe,fontSize:"1.5rem",cursor:"pointer",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%"}}>×</button>
          </div>
        );
      })()}

      {/* Amenity modal */}
      {amenModal&&(
        <Backdrop onClose={()=>setAmenModal(null)}>
          <ModalBox width={560}>
            <div style={{height:240,position:"relative",overflow:"hidden"}}>
              <img src={amenModal.photo} alt={amenModal.name} loading="lazy" decoding="async" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(transparent 35%,rgba(26,15,8,.85))"}}/>
              <div style={{position:"absolute",bottom:"1.6rem",left:"2rem"}}>
                <div style={{color:C.ivory,fontSize:"1.75rem",fontWeight:400}}>{lang==="es"?amenModal.name:amenModal.nameEn}</div>
              </div>
              <button onClick={()=>setAmenModal(null)} style={{position:"absolute",top:".85rem",right:".85rem",background:"rgba(26,15,8,.6)",border:"none",color:"#fff",fontSize:"1.5rem",cursor:"pointer",width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%"}}>×</button>
            </div>
            <div style={{padding:"1.75rem 2rem"}}>
              <p style={{color:C.ebony,lineHeight:1.85,fontSize:".97rem",marginBottom:"1.6rem"}}>{amenModal.desc}</p>
              <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
                <button className="btn-gold" onClick={()=>{setAmenModal(null);document.getElementById("rooms")?.scrollIntoView({behavior:"smooth"});}}>{t("VER HABITACIONES","VIEW ROOMS")}</button>
                <button className="btn-out" onClick={()=>setAmenModal(null)}>{t("CERRAR","CLOSE")}</button>
              </div>
            </div>
          </ModalBox>
        </Backdrop>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacy&&(
        <Backdrop onClose={()=>setShowPrivacy(false)}>
          <ModalBox>
            <ModalHdr title="Política de Privacidad" sub="CAONABO 35" onClose={()=>setShowPrivacy(false)}/>
            <div style={{fontFamily:"'Lato',sans-serif",fontSize:".82rem",color:C.ebony,whiteSpace:"pre-wrap",lineHeight:1.7,maxHeight:"60vh",overflowY:"auto"}}>
              {PRIVACY_POLICY_ES}
            </div>
          </ModalBox>
        </Backdrop>
      )}

      {/* Guest Portal Modal */}
      {guestPortalOpen&&(
        <Backdrop onClose={()=>{setGuestPortalOpen(false);setGuestBooking(null);setGuestLookupError('');setGuestLookup({id:'',email:''});}}>
          <ModalBox>
            <ModalHdr title={t("Mi Reserva","My Booking")} sub={t("CONSULTA TU RESERVA","VIEW YOUR BOOKING")} onClose={()=>{setGuestPortalOpen(false);setGuestBooking(null);setGuestLookupError('');}}/>
            <div style={{padding:"1.5rem 2rem"}}>
            {!guestBooking?(
              <div>
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".84rem",color:C.taupe,marginBottom:"1.25rem"}}>{t("Ingresa el email que usaste al hacer tu reserva.","Enter the email you used when making your booking.")}</p>
                {guestLookupError&&<div className="error-banner" style={{marginBottom:"1rem"}}>{guestLookupError}</div>}
                <div style={{marginBottom:".9rem"}}><FL>{t("Email de tu reserva","Booking Email")}</FL><Inp type="email" value={guestLookup.email} onChange={e=>setGuestLookup(p=>({...p,email:e.target.value}))} placeholder="tu@email.com"/></div>
                <div style={{marginBottom:"1.25rem"}}><FL>{t("Teléfono de tu reserva","Booking Phone")}</FL><Inp type="tel" value={guestLookup.phone} onChange={e=>setGuestLookup(p=>({...p,phone:e.target.value}))} placeholder="+1 809 000 0000"/></div>
                <button className="btn-gold" style={{width:"100%"}} onClick={lookupGuestBooking} disabled={guestLookupLoading}>{guestLookupLoading?t("Buscando...","Searching..."):t("BUSCAR RESERVA","FIND BOOKING")}</button>
              </div>
            ):(
              <div>
                <div style={{padding:"1rem",background:"#F1F8E9",borderLeft:"3px solid #2E7D32",marginBottom:"1.25rem",fontFamily:"'Lato',sans-serif"}}>
                  <div style={{fontSize:".62rem",color:C.taupe,textTransform:"uppercase",letterSpacing:".12em",marginBottom:".4rem"}}>Estado</div>
                  <div style={{fontWeight:700,color:"#2E7D32",fontSize:"1rem"}}>
                    {guestBooking.status==="confirmed"?"✅ Confirmada":guestBooking.status==="pending"?"⏳ Pendiente de confirmación":guestBooking.status==="checked_in"?"🏨 En Hotel":guestBooking.status==="finalizada"?"✓ Finalizada":"❌ Cancelada"}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".85rem",fontFamily:"'Lato',sans-serif",marginBottom:"1.25rem"}}>
                  {[["Reserva #",guestBooking.id],[t("Huésped","Guest"),guestBooking.guest],[t("Habitación","Room"),rooms.find(r=>r.id===guestBooking.room)?.name],[t("Check-in","Check-in"),guestBooking.check_in],[t("Check-out","Check-out"),guestBooking.check_out],[t("Noches","Nights"),guestBooking.nights],[t("Huéspedes","Guests"),guestBooking.guests],[t("Total","Total"),fmtMoney(guestBooking.total)],[t("Pago","Payment"),guestBooking.paid?t("✓ Pagado","✓ Paid"):t("Pendiente","Pending")]].map(([l,v])=>(
                    <div key={l}><div style={{fontSize:".6rem",color:C.taupe,textTransform:"uppercase",letterSpacing:".1em",marginBottom:".2rem"}}>{l}</div><div style={{fontWeight:700,color:C.ebony,fontSize:".85rem"}}>{v}</div></div>
                  ))}
                </div>
                {guestBooking.notes&&<div style={{padding:".75rem 1rem",background:C.smoke,borderLeft:`3px solid ${C.gold}`,marginBottom:"1rem",fontFamily:"'Lato',sans-serif",fontSize:".83rem",fontStyle:"italic"}}>{guestBooking.notes}</div>}
                <p style={{fontFamily:"'Lato',sans-serif",fontSize:".78rem",color:C.taupe,textAlign:"center",marginBottom:".75rem"}}>{t("¿Necesitas ayuda? Escríbenos por WhatsApp.","Need help? Message us on WhatsApp.")}</p>
                <a href={`https://wa.me/${settings.whatsapp}`} style={{textDecoration:"none",display:"block"}}><button className="btn-gold" style={{width:"100%"}}>💬 WhatsApp</button></a>
              </div>
            )}
            </div>
          </ModalBox>
        </Backdrop>
      )}

    </div>
  );
} // end App
