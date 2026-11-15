import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import {validPin, invitationURL, invitationQR} from '../invitation.js';
let count = 0;
const check = (value, label) => { assert.ok(value, label); console.log(`PASS ${++count}: ${label}`); };
check(validPin('001234') && !validPin('12345') && !validPin('1234567') && !validPin('<svg/>') && !validPin(123456), 'Only six numeric characters accepted');
check(invitationURL('javascript:alert(1)', '123456') === null, 'Non-web scheme rejected');
check(invitationURL('https://example.invalid/radioquiz/', 'bad') === null, 'Invalid PIN produces no invitation');
for (const pin of ['001234', '999999']) {
  const url = invitationURL('https://patriciaamaralcriativa.github.io/radioquiz/?view=teacher&room=secret#access_token=secret', pin);
  check(url === `https://patriciaamaralcriativa.github.io/radioquiz/?pin=${pin}`, 'Teacher parameters and authentication fragment excluded');
  const svg = invitationQR(url);
  const edge = Number(svg.match(/viewBox="0 0 (\d+)/)[1]);
  const scale = 8, width = edge * scale;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  for (const match of svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
    const x = +match[1] * scale, y = +match[2] * scale;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const offset = ((y + dy) * width + x + dx) * 4;
      pixels[offset] = 16; pixels[offset + 1] = 43; pixels[offset + 2] = 80;
    }
  }
  const decoded = jsQR(pixels, width, width);
  check(decoded?.data === url, 'Independent decoder reads the actual SVG modules as the intended invitation');
  check(!svg.includes(url) && !svg.includes('secret'), 'SVG contains no interpolated URL or administrative data');
}
console.log(`\n${count} invitation checks passed. Physical phone camera scanning is not covered.`);
