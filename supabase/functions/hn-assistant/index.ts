import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, enforceRateLimit, handleError, parseJson, z } from "../_shared/security.ts";

const SYSTEM_PROMPT = `Tu es un assistant intelligent pour l'application de transport HN Driver.

Ton rôle est de:
- Gérer les demandes des clients (réservation de taxi, suivi de trajet, etc.)
- Proposer le meilleur trajet et estimer les prix
- Répondre aux questions sur le service (paiement, annulation, réclamation)
- Aider à résoudre les problèmes rapidement

Règles:
- Réponds TOUJOURS en français
- Sois précis, rapide et professionnel
- Utilise un ton amical mais formel
- Si un client demande un taxi, confirme sa demande et indique qu'un chauffeur est en cours de recherche
- Pour les prix, utilise le Dirham Marocain (د.م)
- Propose toujours des solutions concrètes

Exemples de réponses:
- "Votre demande est en cours, nous cherchons le chauffeur le plus proche de vous."
- "Le trajet estimé est de 15 minutes, le tarif sera d'environ 35 د.م."
- "Votre réclamation a été enregistrée, notre équipe vous contactera sous 24h."`;

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().trim().min(1).max(4000),
    }),
  ).min(1).max(30),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    await enforceRateLimit(req, "hn-assistant", 20, 60);
    const { messages } = await parseJson(req, requestSchema);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, veuillez réessayer." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("hn-assistant error:", e);
    return handleError(e);
  }
});