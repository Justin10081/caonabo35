// Regenerates public/favicon.svg, favicon.ico, apple-touch-icon.png and public/og/caonabo35-og.jpg.
// Not part of the build. Needs playwright + opentype.js resolvable, e.g.:
//   npm i --no-save playwright opentype.js && node scripts/brand-assets.mjs [path/to/photo.jpg]
// Swap in a higher-resolution photo (>= 1200x630) as the argument when one is available.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = (...p) => path.join(root, 'public', ...p);
const photo = process.argv[2] || pub('img', 'terrace.jpg');

const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Lato:wght@700';
const css = await (await fetch(FONT_CSS, { headers: { 'User-Agent': 'curl/8' } })).text();
const ttf = {};
for (const m of css.matchAll(/font-family: '([^']+)';[^}]*?font-weight: (\d+);[^}]*?url\(([^)]+\.ttf)\)/g)) {
  ttf[`${m[1]}${m[2]}`] = Buffer.from(await (await fetch(m[3])).arrayBuffer());
}
const corm600 = ttf['Cormorant Garamond600'], corm500 = ttf['Cormorant Garamond500'], lato700 = ttf['Lato700'];
if (!corm600 || !corm500 || !lato700) throw new Error('font download failed');

// Monogram as outlined paths so it never depends on installed fonts; lining figures read better than old-style at 16px.
const font = opentype.parse(corm600.buffer.slice(corm600.byteOffset, corm600.byteOffset + corm600.byteLength));
const glyph = (name) => { for (let i = 0; i < font.glyphs.length; i++) if (font.glyphs.get(i).name === name) return font.glyphs.get(i); throw new Error(name); };
const layout = () => {
  const p = new opentype.Path(); let x = 0;
  [font.charToGlyph('C'), glyph('three.lf'), glyph('five.lf')].forEach((g, i) => { p.extend(g.getPath(x, 0, 36)); x += g.advanceWidth * 36 / font.unitsPerEm - (i < 2 ? 1.5 : 0); });
  return p;
};
const bb = layout().getBoundingBox();
const mono = layout(), dx = (64 - (bb.x2 - bb.x1)) / 2 - bb.x1, dy = (64 - (bb.y2 - bb.y1)) / 2 - bb.y1;
mono.commands.forEach((c) => { for (const k of ['x', 'x1', 'x2']) if (c[k] !== undefined) c[k] += dx; for (const k of ['y', 'y1', 'y2']) if (c[k] !== undefined) c[k] += dy; });
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#2A1F16"/><path fill="#C4973A" d="${mono.toPathData(1)}"/></svg>\n`;
fs.writeFileSync(pub('favicon.svg'), svg);

const browser = await chromium.launch();
const shot = async (w, h, html, opts) => {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(html); await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: w, height: h }, ...opts });
  await page.close(); return buf;
};
const sized = (s, src) => `<body style="margin:0">${src.replace('<svg ', `<svg width="${s}" height="${s}" `)}</body>`;
const pngs = [];
for (const s of [16, 32, 48]) pngs.push([s, await shot(s, s, sized(s, svg), { type: 'png', omitBackground: true })]);
// iOS rounds the corners itself, so the touch icon is full-bleed.
fs.writeFileSync(pub('apple-touch-icon.png'), await shot(180, 180, sized(180, svg.replace('rx="12"', 'rx="0"')), { type: 'png' }));

const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
let off = 6 + 16 * pngs.length;
const dir = pngs.map(([s, b]) => { const e = Buffer.alloc(16); e.writeUInt8(s, 0); e.writeUInt8(s, 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(b.length, 8); e.writeUInt32LE(off, 12); off += b.length; return e; });
fs.writeFileSync(pub('favicon.ico'), Buffer.concat([head, ...dir, ...pngs.map((x) => x[1])]));

const b64 = (b) => b.toString('base64');
const og = `<!doctype html><style>
@font-face{font-family:C;src:url(data:font/ttf;base64,${b64(corm500)})}
@font-face{font-family:L;src:url(data:font/ttf;base64,${b64(lato700)})}
body{margin:0;width:1200px;height:630px;overflow:hidden;background:#2A1F16}
.ph{position:absolute;inset:0;width:1200px;height:630px;object-fit:cover;object-position:50% 30%}
.sh{position:absolute;inset:0;background:linear-gradient(90deg,rgba(26,15,8,.86) 0%,rgba(26,15,8,.55) 38%,rgba(26,15,8,0) 66%),linear-gradient(0deg,rgba(26,15,8,.55),rgba(26,15,8,0) 40%)}
.t{position:absolute;left:72px;bottom:74px}
.w{font-family:C;color:#F7F3EE;font-size:92px;letter-spacing:.05em;line-height:.95}.w em{font-style:normal;color:#E8C97A}
.r{width:64px;height:2px;background:#C4973A;margin:26px 0 20px}
.s{font-family:L;color:#D4C5B0;font-size:19px;letter-spacing:.32em;text-transform:uppercase}
</style><img class="ph" src="data:image/jpeg;base64,${b64(fs.readFileSync(photo))}"><div class="sh"></div>
<div class="t"><div class="w">Caonabo <em>35</em></div><div class="r"></div><div class="s">Santo Domingo · R.D.</div></div>`;
fs.mkdirSync(pub('og'), { recursive: true });
fs.writeFileSync(pub('og', 'caonabo35-og.jpg'), await shot(1200, 630, og, { type: 'jpeg', quality: 86 }));
await browser.close();
console.log('brand assets written to public/');
