const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type LeadEmailPayload = {
  type?: string;
  title?: string;
  fields?: Record<string, unknown>;
  items?: Array<Record<string, unknown>>;
  notes?: string | null;
  utm?: unknown;
};

const DEFAULT_TO = "contato@asiapecas.com.br";
const DEFAULT_FROM = "Ásia Peças <no-reply@asiapecas.com.br>";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function rows(fields: Record<string, unknown> = {}) {
  return Object.entries(fields)
    .map(([key, value]) => {
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #ececec;color:#555;font-weight:600;width:170px;">${escapeHtml(key)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ececec;color:#111;">${escapeHtml(formatValue(value)).replaceAll("\n", "<br />")}</td>
        </tr>
      `;
    })
    .join("");
}

function itemsTable(items: Array<Record<string, unknown>> = []) {
  if (!items.length) return "";

  const body = items
    .map((item) => {
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #ececec;color:#111;font-family:monospace;">${escapeHtml(formatValue(item.material))}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ececec;color:#111;">${escapeHtml(formatValue(item.description))}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ececec;color:#111;text-align:center;">${escapeHtml(formatValue(item.quantity))}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <h2 style="margin:28px 0 10px;font-size:18px;color:#111;">Itens solicitados</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #ececec;border-radius:10px;overflow:hidden;">
      <thead>
        <tr style="background:#f6b800;color:#111;">
          <th align="left" style="padding:10px 12px;">Código</th>
          <th align="left" style="padding:10px 12px;">Descrição</th>
          <th align="center" style="padding:10px 12px;">Qtd.</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function buildHtml(payload: LeadEmailPayload) {
  const title = payload.title || "Novo formulário recebido";
  const notes = payload.notes
    ? `<h2 style="margin:28px 0 10px;font-size:18px;color:#111;">Mensagem</h2><div style="padding:14px 16px;background:#fafafa;border:1px solid #ececec;border-radius:10px;color:#111;line-height:1.6;">${escapeHtml(payload.notes).replaceAll("\n", "<br />")}</div>`
    : "";
  const utm = payload.utm
    ? `<h2 style="margin:28px 0 10px;font-size:18px;color:#111;">UTM / origem</h2><pre style="white-space:pre-wrap;padding:14px 16px;background:#111;color:#f6b800;border-radius:10px;font-size:12px;">${escapeHtml(JSON.stringify(payload.utm, null, 2))}</pre>`
    : "";

  return `
    <div style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:720px;margin:0 auto;padding:28px 16px;">
        <div style="background:#050505;color:#fff;border-radius:16px 16px 0 0;padding:22px 24px;">
          <p style="margin:0 0 8px;color:#f6b800;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;">Ásia Peças & Máquinas</p>
          <h1 style="margin:0;font-size:24px;line-height:1.2;">${escapeHtml(title)}</h1>
        </div>
        <div style="background:#fff;border:1px solid #e7e7e7;border-top:0;border-radius:0 0 16px 16px;padding:24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #ececec;border-radius:10px;overflow:hidden;">
            <tbody>${rows(payload.fields)}</tbody>
          </table>
          ${itemsTable(payload.items)}
          ${notes}
          ${utm}
          <p style="margin:28px 0 0;color:#777;font-size:12px;">Email automático gerado por formulário do site.</p>
        </div>
      </div>
    </div>
  `;
}

function buildText(payload: LeadEmailPayload) {
  const lines = [
    payload.title || "Novo formulário recebido",
    "",
    ...Object.entries(payload.fields || {}).map(([key, value]) => `${key}: ${formatValue(value)}`),
  ];

  if (payload.items?.length) {
    lines.push("", "Itens:");
    payload.items.forEach((item) => {
      lines.push(`- ${formatValue(item.material)} | ${formatValue(item.description)} | qtd: ${formatValue(item.quantity)}`);
    });
  }

  if (payload.notes) lines.push("", "Mensagem:", payload.notes);
  if (payload.utm) lines.push("", "UTM:", JSON.stringify(payload.utm, null, 2));
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json()) as LeadEmailPayload;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const to = Deno.env.get("LEAD_EMAIL_TO") || DEFAULT_TO;
    const from = Deno.env.get("LEAD_EMAIL_FROM") || DEFAULT_FROM;

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is not configured. Lead email skipped.", payload.type);
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "RESEND_API_KEY missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = `[Ásia Peças] ${payload.title || "Novo formulário recebido"}`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: buildHtml(payload),
        text: buildText(payload),
        reply_to: typeof payload.fields?.Email === "string" ? payload.fields.Email : undefined,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Resend failed", result);
      return new Response(JSON.stringify({ error: "Email provider failed", details: result }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-lead-email error", error);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
