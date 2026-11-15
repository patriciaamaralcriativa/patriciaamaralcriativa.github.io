import QRCode from './vendor/qrcode.js';

export function validPin(value) {
  return typeof value === 'string' && /^[0-9]{6}$/.test(value);
}

export function invitationURL(page, pin) {
  if (!validPin(pin)) return null;
  const url = new URL(page);
  if (!['https:', 'http:'].includes(url.protocol)) return null;
  url.search = '';
  url.hash = '';
  url.searchParams.set('pin', pin);
  return url.href;
}

export function invitationQR(url) {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size, margin = 4, edge = size + margin * 2;
  let path = '';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (qr.modules.get(y, x)) path += `M${x + margin} ${y + margin}h1v1h-1z`;
  }
  // Only numeric module coordinates enter the SVG; the URL is never interpolated as markup.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${edge} ${edge}" role="img" aria-label="QR Code para entrar na sala" shape-rendering="crispEdges"><rect width="${edge}" height="${edge}" fill="#fff"/><path d="${path}" fill="#102b50"/></svg>`;
}
