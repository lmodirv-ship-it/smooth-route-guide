/** Context-aware canned messages for ride chat */

export type MessageContext = "before_arrival" | "at_arrival" | "during_trip" | "delay" | "delivery" | "general";

export interface CannedMessage {
  id: string;
  text_ar: string;
  context: MessageContext[];
}

export const DRIVER_CANNED_MESSAGES: CannedMessage[] = [
  // Before arrival
  { id: "d1", text_ar: "أنا في الطريق إليك", context: ["before_arrival"] },
  { id: "d2", text_ar: "سأصل خلال دقائق قليلة", context: ["before_arrival"] },
  { id: "d3", text_ar: "هل يمكنك تأكيد موقع الاستلام؟", context: ["before_arrival"] },
  // At arrival
  { id: "d4", text_ar: "وصلت إلى موقعك", context: ["at_arrival"] },
  { id: "d5", text_ar: "أنا أمام الباب", context: ["at_arrival"] },
  { id: "d6", text_ar: "أنا بالانتظار عند نقطة الالتقاء", context: ["at_arrival"] },
  // During trip
  { id: "d7", text_ar: "سنصل قريبًا إن شاء الله", context: ["during_trip"] },
  { id: "d8", text_ar: "هناك ازدحام في الطريق", context: ["during_trip", "delay"] },
  // Delay
  { id: "d9", text_ar: "عذرًا، سأتأخر قليلاً", context: ["delay"] },
  { id: "d10", text_ar: "أعتذر عن التأخير، أنا في الطريق", context: ["delay"] },
  // Delivery
  { id: "d11", text_ar: "تم استلام الطلب وأنا في الطريق", context: ["delivery"] },
  { id: "d12", text_ar: "وصلت لمكان التسليم", context: ["delivery"] },
  // General
  { id: "d13", text_ar: "شكرًا لك", context: ["general"] },
  { id: "d14", text_ar: "تم بنجاح", context: ["general"] },
];

export const CUSTOMER_CANNED_MESSAGES: CannedMessage[] = [
  // Before arrival
  { id: "c1", text_ar: "أنا في الانتظار", context: ["before_arrival", "at_arrival"] },
  { id: "c2", text_ar: "أين أنت الآن؟", context: ["before_arrival"] },
  { id: "c3", text_ar: "متى ستصل تقريبًا؟", context: ["before_arrival", "delay"] },
  // At arrival
  { id: "c4", text_ar: "أنا خارج المبنى", context: ["at_arrival"] },
  { id: "c5", text_ar: "سأنزل الآن", context: ["at_arrival"] },
  { id: "c6", text_ar: "أنا عند المدخل الرئيسي", context: ["at_arrival"] },
  // During trip
  { id: "c7", text_ar: "هل يمكنك التوقف هنا من فضلك؟", context: ["during_trip"] },
  { id: "c8", text_ar: "غيّرت وجهتي، سأخبرك", context: ["during_trip"] },
  // Delay
  { id: "c9", text_ar: "هل تأخرت؟", context: ["delay"] },
  // Delivery
  { id: "c10", text_ar: "أنا بالانتظار لاستلام الطلب", context: ["delivery"] },
  // General
  { id: "c11", text_ar: "شكرًا لك", context: ["general"] },
  { id: "c12", text_ar: "حسنًا", context: ["general"] },
  { id: "c13", text_ar: "نعم", context: ["general"] },
  { id: "c14", text_ar: "لا", context: ["general"] },
];

// Regex patterns for personal info filtering in displayed messages
const PHONE_REGEX = /(\+?\d[\d\s\-]{7,})/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_REGEX = /https?:\/\/[^\s]+/gi;
const SOCIAL_KEYWORDS = /(?:whatsapp|واتساب|الواتساب|telegram|تيليغرام|facebook|فيسبوك|instagram|إنستغرام|انستقرام|snapchat|سناب|tiktok|تيكتوك)/gi;

/**
 * Check if a message is a known canned message (safe to display as-is)
 */
export function isCannedMessage(text: string): boolean {
  const all = [...DRIVER_CANNED_MESSAGES, ...CUSTOMER_CANNED_MESSAGES];
  return all.some((m) => m.text_ar === text.trim());
}

/**
 * Filter message content for display — redact personal info from legacy/old messages
 */
export function filterMessageForDisplay(text: string): string {
  if (isCannedMessage(text)) return text;

  let filtered = text;
  filtered = filtered.replace(PHONE_REGEX, "***");
  filtered = filtered.replace(EMAIL_REGEX, "***");
  filtered = filtered.replace(URL_REGEX, "[رابط محذوف]");
  filtered = filtered.replace(SOCIAL_KEYWORDS, "***");
  return filtered;
}

/**
 * Validate that a message is an allowed canned message before sending
 */
export function validateCannedMessage(text: string, role: "driver" | "customer"): boolean {
  const list = role === "driver" ? DRIVER_CANNED_MESSAGES : CUSTOMER_CANNED_MESSAGES;
  return list.some((m) => m.text_ar === text.trim());
}
