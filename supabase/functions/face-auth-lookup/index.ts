import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  enforceRateLimit,
  handleError,
  HttpError,
  jsonResponse,
  parseJson,
  z,
} from "../_shared/security.ts";

// Face descriptors are 128-dim float arrays from face-api.js
const DescriptorSchema = z.array(z.number()).min(64).max(512);

const RequestSchema = z.object({
  email: z.string().email().max(255),
  action: z.enum(["verify", "log_attempt"]).default("verify"),
  // For verify: client sends its captured descriptor; server compares.
  candidate_descriptor: DescriptorSchema.optional(),
  // Optional small thumbnail for audit log only (not used for matching)
  photo_data: z.string().max(200_000).optional(),
});

// Standard face-api.js threshold for a "match"
const MATCH_THRESHOLD = 0.6;

function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit by IP/auth identifier — prevents enumeration & spam
    await enforceRateLimit(req, "face-auth-lookup", 10, 60);

    const { email, action, candidate_descriptor, photo_data } =
      await parseJson(req, RequestSchema);

    const normalizedEmail = email.toLowerCase().trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // ─── Log a failed attempt ──────────────────────────────────────
    if (action === "log_attempt") {
      await supabase.from("face_auth_attempts").insert({
        target_email: normalizedEmail,
        photo_data: photo_data || null,
        result: "rejected",
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (profile) {
        await supabase.from("notifications").insert({
          user_id: profile.id,
          type: "security",
          message:
            "⚠️ محاولة دخول غير مصرح بها إلى حسابك. شخص غير معروف حاول تسجيل الدخول.",
        });
      }

      return jsonResponse({ ok: true });
    }

    // ─── Verify action ─────────────────────────────────────────────
    // Server-side comparison — descriptor NEVER leaves the server.
    if (!candidate_descriptor) {
      throw new HttpError(400, "candidate_descriptor_required");
    }

    const { data, error } = await supabase
      .from("face_auth_profiles")
      .select("descriptor")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      throw new HttpError(500, "db_error");
    }

    if (!data) {
      // No face registered — allow normal login flow
      return jsonResponse({ registered: false });
    }

    const stored = data.descriptor as unknown;
    if (!Array.isArray(stored)) {
      return jsonResponse({ registered: true, match: false });
    }

    const distance = euclideanDistance(
      candidate_descriptor,
      stored as number[]
    );
    const match = Number.isFinite(distance) && distance < MATCH_THRESHOLD;

    // Audit failed verification attempts
    if (!match) {
      await supabase.from("face_auth_attempts").insert({
        target_email: normalizedEmail,
        photo_data: photo_data || null,
        result: "rejected",
      });
    }

    return jsonResponse({ registered: true, match });
  } catch (e) {
    return handleError(e);
  }
});
