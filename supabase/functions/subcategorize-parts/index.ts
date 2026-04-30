import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createOpenAIChatCompletion, extractToolArguments, resolveOpenAIModel } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUBCATEGORIES = [
  "Pneus",
  "Faróis e Iluminação",
  "Filtros",
  "Mangueiras e Tubos",
  "Rolamentos",
  "Cilindros Hidráulicos",
  "Bombas",
  "Correias",
  "Vedações e Retentores",
  "Fixadores",
  "Implementos de Solo",
  "Baterias",
  "Radiadores e Arrefecimento",
  "Alternadores",
  "Motor de Partida",
  "Injetores e Bicos",
  "Turbinas",
  "Válvulas",
  "Sensores",
  "Chicotes Elétricos",
  "Freios e Embreagem",
  "Amortecedores",
  "Material Rodante",
  "Engrenagens",
  "Eixos e Cardans",
  "Cabine e Vidros",
  "Bancos",
  "Retrovisores",
  "Ar Condicionado",
  "Lubrificantes e Fluidos",
  "Adesivos e Plaquetas",
  "Kits de Reparo",
  "Outros Acessórios",
] as const;

interface PartIn {
  id: string;
  material: string;
  description: string;
  manufacturer?: string | null;
  machine_model?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const model = resolveOpenAIModel("OPENAI_MODEL_SUBCATEGORIZE_PARTS", "gpt-4.1-mini");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const mode: "preview" | "apply" | "auto" = body.mode === "apply" ? "apply" : body.mode === "auto" ? "auto" : "preview";
    const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 500);

    if (mode === "apply") {
      const updates: Array<{ id: string; subcategory: string }> = body.updates || [];
      let ok = 0;
      for (const u of updates) {
        const { error } = await supabase
          .from("parts")
          .update({ part_category: u.subcategory, reviewed_at: new Date().toISOString() })
          .eq("id", u.id);
        if (!error) ok++;
      }
      return new Response(JSON.stringify({ updated: ok, total: updates.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // preview/auto: peças sem subcategoria (nova coluna funcional)
    const { data: parts, error } = await supabase
      .from("parts")
      .select("id,material,description,manufacturer,machine_model,part_category,subcategory")
      .is("subcategory", null)
      .limit(limit);

    if (error) throw error;
    if (!parts || parts.length === 0) {
      return new Response(JSON.stringify({ suggestions: [], updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const itemsForAI = (parts as PartIn[]).map((p) => ({
      id: p.id,
      desc: p.description?.slice(0, 200) || p.material,
      mfr: p.manufacturer || "",
      model: p.machine_model || "",
    }));

    const aiResp = await createOpenAIChatCompletion({
      model,
      messages: [
        {
          role: "system",
          content:
            "Você é especialista em peças de máquinas pesadas. Classifique cada peça em UMA das subcategorias fornecidas. Retorne via tool call.",
        },
        {
          role: "user",
          content: `Classifique cada peça abaixo. Subcategorias permitidas: ${SUBCATEGORIES.join(", ")}\n\nPeças:\n${JSON.stringify(itemsForAI)}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "classify_parts",
            description: "Classifica peças em subcategorias",
            parameters: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      subcategory: { type: "string", enum: [...SUBCATEGORIES] },
                      confidence: { type: "number", minimum: 0, maximum: 1 },
                      reasoning: { type: "string" },
                    },
                    required: ["id", "subcategory", "confidence"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["results"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "classify_parts" } },
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit. Tente novamente em alguns segundos." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      throw new Error(`AI provider: ${aiResp.status} ${t}`);
    }

    const aiJson = await aiResp.json();
    const args = extractToolArguments<{ results: Array<{ id: string; subcategory: string; confidence: number; reasoning?: string }> }>(aiJson) || { results: [] };

    const partMap = new Map(parts.map((p) => [p.id, p]));
    const results = (args.results || []) as Array<{ id: string; subcategory: string; confidence: number; reasoning?: string }>;

    // auto mode: aplica direto no banco (confiança >= 0.5)
    let updated = 0;
    if (mode === "auto") {
      for (const r of results) {
        if (!r.subcategory || (r.confidence ?? 0) < 0.5) continue;
        const { error: upErr } = await supabase
          .from("parts")
          .update({
            subcategory: r.subcategory,
            subcategory_source: "ai",
            subcategory_confidence: r.confidence,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", r.id);
        if (!upErr) updated++;
      }
      return new Response(JSON.stringify({ updated, total: results.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const suggestions = results.map((r) => {
      const p = partMap.get(r.id);
      return {
        id: r.id,
        material: p?.material,
        description: p?.description,
        currentCategory: p?.part_category || "Sem categoria",
        suggestedSubcategory: r.subcategory,
        confidence: r.confidence,
        reasoning: r.reasoning,
      };
    });

    return new Response(JSON.stringify({ suggestions, batchSize: parts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("subcategorize-parts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
