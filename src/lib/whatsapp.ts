/**
 * WhatsApp link helper — sanitizes phone numbers and builds wa.me deep links.
 *
 * Brazilian default DDI = 55. Accepts numbers with or without country code.
 * Returns null when phone is empty or has fewer than 10 useful digits.
 */
export function sanitizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 10) return null;
  // If already has country code (>= 12 digits and starts with 55), keep as is
  if (digits.length >= 12 && digits.startsWith("55")) return digits;
  // Otherwise prepend BR DDI
  return `55${digits}`;
}

export function defaultGreeting(name?: string | null): string {
  const first = (name || "").trim().split(/\s+/)[0] || "";
  return first
    ? `Olá ${first}, sou da Ásia Peças & Máquinas. Posso ajudar?`
    : `Olá, sou da Ásia Peças & Máquinas. Posso ajudar?`;
}

export const PUBLIC_WHATSAPP_MESSAGE = "Ol\u00e1, vim pelo site Asia Pe\u00e7as!";
export const PUBLIC_WHATSAPP_URL = `https://wa.me/message/HUI75YYGCYL7F1?text=${encodeURIComponent(
  PUBLIC_WHATSAPP_MESSAGE,
)}`;

export function formatWhatsAppLink(phone?: string | null, message?: string): string | null {
  const clean = sanitizePhone(phone);
  if (!clean) return null;
  const text = encodeURIComponent(message || "");
  return text ? `https://wa.me/${clean}?text=${text}` : `https://wa.me/${clean}`;
}
