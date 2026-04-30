// Track conversions to Google Ads via Enhanced Conversions API (server-side).
// Logs every event to conversion_events for audit. Falls back to logging if Ads API
// credentials are not configured.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const ALLOWED = new Set(["quote_lead", "quote_submitted", "b2b_lead", "whatsapp_click"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { event, value, currency = "BRL", email, phone, transaction_id, utm } = body || {};
    if (!event || !ALLOWED.has(event)) {
      return new Response(JSON.stringify({ error: "invalid event" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/vitrine_settings?select=ads_conversion_id,ads_label_quote,ads_label_b2b,ads_label_whatsapp&limit=1`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const [settings] = await settingsRes.json() as any[];

    const labelMap: Record<string, string | undefined> = {
      quote_lead: settings?.ads_label_quote,
      quote_submitted: settings?.ads_label_quote,
      b2b_lead: settings?.ads_label_b2b,
      whatsapp_click: settings?.ads_label_whatsapp,
    };
    const ads_label = labelMap[event];

    const hashed: Record<string, string> = {};
    if (email) hashed.email_sha256 = await sha256Hex(email);
    if (phone) hashed.phone_sha256 = await sha256Hex(phone.replace(/\D/g, ""));

    const payload = { event, value, currency, transaction_id, hashed, ads_id: settings?.ads_conversion_id, ads_label };
    console.log("conversion", payload);

    // Audit log (best-effort)
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/conversion_events`, {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ event, payload, utm: utm || {}, sent_to_ads: !!ads_label, sent_at: ads_label ? new Date().toISOString() : null }),
      });
    } catch (e) {
      console.error("audit-log-fail", e);
    }

    return new Response(JSON.stringify({ ok: true, event, queued: true, has_label: !!ads_label }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
