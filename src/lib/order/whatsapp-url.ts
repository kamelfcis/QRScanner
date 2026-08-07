/** Strip non-digits for wa.me links (keeps country code digits). */
export function normalizeWhatsAppPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = normalizeWhatsAppPhone(phone);
  if (!digits) {
    throw new Error('WhatsApp phone number is required');
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
