import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/g;
const MULTIPLE_SPACES_REGEX = /\s+/g;
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

let adminClient: ReturnType<typeof createClient> | null = null;

export class HttpError extends Error {
  status: number;
  extraHeaders?: Record<string, string>;

  constructor(status: number, message: string, extraHeaders?: Record<string, string>) {
    super(message);
    this.status = status;
    this.extraHeaders = extraHeaders;
  }
}

export function sanitizePlainText(value: unknown, maxLength = 500) {
  return String(value ?? "")
    .replace(CONTROL_CHARS_REGEX, "")
    .replace(MULTIPLE_SPACES_REGEX, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeRequiredText(value: unknown, field: string, maxLength = 500) {
  const cleaned = sanitizePlainText(value, maxLength);
  if (!cleaned) {
    throw new HttpError(400, `${field}_required`);
  }
  return cleaned;
}

export function normalizeOptionalText(value: unknown, maxLength = 500) {
  const cleaned = sanitizePlainText(value, maxLength);
  return cleaned || undefined;
}

export function normalizeUrl(value: unknown) {
  const cleaned = sanitizePlainText(value, 2048);
  if (!cleaned) {
    throw new HttpError(400, "url_required");
  }

  const url = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new HttpError(400, "invalid_url");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new HttpError(400, "invalid_url_protocol");
  }

  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
    throw new HttpError(400, "private_urls_not_allowed");
  }

  if (!parsed.hostname.includes(".")) {
    throw new HttpError(400, "invalid_url_host");
  }

  return parsed.toString();
}

function getAdminClient() {
  if (adminClient) return adminClient;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) throw new HttpError(500, "SUPABASE_URL not configured");

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) throw new HttpError(500, "SUPABASE_SERVICE_ROLE_KEY not configured");

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return adminClient;
}

function getClientIdentifier(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    return `auth:${authHeader.slice(-48)}`;
  }

  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const ip = forwardedFor || realIp || "anonymous";
  return `ip:${ip}`;
}

export async function enforceRateLimit(req: Request, routeName: string, maxRequests: number, windowSeconds: number) {
  const supabase = getAdminClient();
  const identifier = getClientIdentifier(req);

  const { data, error } = await supabase.rpc("enforce_rate_limit", {
    p_route_name: routeName,
    p_key: identifier,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    throw new HttpError(500, `rate_limit_error:${error.message}`);
  }

  if (!data?.allowed) {
    throw new HttpError(429, "too_many_requests", {
      "Retry-After": String(data?.retry_after || windowSeconds),
    });
  }

  return data;
}

export async function parseJson<T>(req: Request, schema: z.ZodSchema<T>) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "invalid_json_body");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new HttpError(400, `${issue.path.join(".") || "body"}: ${issue.message}`);
  }

  return parsed.data;
}

export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

export function handleError(error: unknown) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.message }, error.status, error.extraHeaders);
  }

  const message = error instanceof Error ? error.message : "unknown_error";
  return jsonResponse({ error: message }, 500);
}

export { z };
