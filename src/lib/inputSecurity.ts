import { z } from "zod";

const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/g;
const MULTIPLE_SPACES_REGEX = /\s+/g;
const DISALLOWED_URL_PROTOCOLS = new Set(["javascript:", "data:", "file:", "vbscript:"]);
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/i,
  /\.local$/i,
];

export const emailSchema = z.string().trim().email().max(255);
export const passwordSchema = z.string().min(8).max(128);
export const shortTextSchema = (max = 120) => z.string().trim().min(1).max(max);
export const optionalTextSchema = (max = 500) => z.string().trim().max(max).optional().or(z.literal(""));

export function sanitizePlainText(value: string, maxLength = 500) {
  return value
    .replace(CONTROL_CHARS_REGEX, "")
    .replace(MULTIPLE_SPACES_REGEX, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeEmail(value: string) {
  return sanitizePlainText(value, 255).toLowerCase();
}

export function sanitizeSearchParam(value: string | null | undefined, maxLength = 120) {
  return sanitizePlainText(value ?? "", maxLength);
}

export function sanitizeOptionalUrl(value: string, maxLength = 2048) {
  const normalized = sanitizePlainText(value, maxLength);
  if (!normalized) return "";

  const withProtocol = /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
  const parsed = new URL(withProtocol);

  if (DISALLOWED_URL_PROTOCOLS.has(parsed.protocol)) {
    throw new Error("نوع الرابط غير مسموح");
  }

  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
    throw new Error("الرابط الداخلي أو المحلي غير مسموح");
  }

  if (!parsed.hostname.includes(".")) {
    throw new Error("الرابط غير صالح");
  }

  return parsed.toString();
}

export function sanitizeSafeOrigin(value: string) {
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("origin غير صالح");
  }
  return parsed.origin;
}

export function getSafeWindowOrigin() {
  if (typeof window === "undefined") {
    return "";
  }

  return sanitizeSafeOrigin(window.location.origin);
}
