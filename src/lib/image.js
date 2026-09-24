// Client-side image downscaling. Both helpers REJECT when the browser can't
// decode the file (e.g. HEIC on Android/desktop Chrome, a PDF renamed .jpg),
// instead of leaving the caller waiting forever.

function loadImage(file, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('no file'));
    if (file.type && !file.type.startsWith('image/')) return reject(new Error('not an image'));
    let url;
    try { url = URL.createObjectURL(file); } catch { return reject(new Error('read failed')); }
    const img = new Image();
    const done = (fn, arg) => { clearTimeout(timer); URL.revokeObjectURL(url); fn(arg); };
    const timer = setTimeout(() => done(reject, new Error('timeout')), timeoutMs);
    img.onload = () => (img.naturalWidth && img.naturalHeight) ? done(resolve, img) : done(reject, new Error('empty image'));
    img.onerror = () => done(reject, new Error('not an image'));
    img.src = url;
  });
}

function drawScaled(img, maxW, maxH) {
  let w = img.naturalWidth, h = img.naturalHeight;
  const ratio = Math.min(maxW / w, maxH / h, 1);
  w = Math.max(1, Math.round(w * ratio)); h = Math.max(1, Math.round(h * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return canvas;
}

// ID photo for the booking form → JPEG data URL (stored in bookings.id_photo_url).
export async function compressImage(file, maxW = 700, maxH = 900, quality = 0.75) {
  const img = await loadImage(file);
  const data = drawScaled(img, maxW, maxH).toDataURL('image/jpeg', quality);
  if (!data.startsWith('data:image/jpeg;base64,')) throw new Error('encode failed');
  return data;
}

// Room photo for Storage upload → JPEG Blob, larger (these are the public hero photos).
export async function compressToBlob(file, maxW = 1600, maxH = 1200, quality = 0.82) {
  const img = await loadImage(file);
  const canvas = drawScaled(img, maxW, maxH);
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('encode failed')), 'image/jpeg', quality));
}
