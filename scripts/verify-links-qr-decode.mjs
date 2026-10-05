/**
 * Generates a classic /links QR (same params as dashboard) and decodes it for proof.
 * Usage: npx -y -p qrcode -p jsqr -p jimp node scripts/verify-links-qr-decode.mjs
 */
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { Jimp } from 'jimp';

const LINKS_URL = 'https://ostol-seafood.engazqr.com/links';

const pngBuffer = await QRCode.toBuffer(LINKS_URL, {
  errorCorrectionLevel: 'H',
  margin: 4,
  width: 512,
  type: 'png',
});

const image = await Jimp.read(pngBuffer);
const { data, width, height } = image.bitmap;
const decoded = jsQR(new Uint8ClampedArray(data), width, height);

console.log(
  JSON.stringify({
    encoded: LINKS_URL,
    decoded: decoded?.data ?? null,
    match: decoded?.data === LINKS_URL,
    pngBytes: pngBuffer.length,
  })
);

if (!decoded || decoded.data !== LINKS_URL) {
  process.exit(1);
}
