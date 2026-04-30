import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOpenAIChatCompletion, extractToolArguments, resolveOpenAIModel } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { material } = await req.json();
    if (!material) throw new Error("material is required");

    const model = resolveOpenAIModel("OPENAI_MODEL_PART_RESEARCH", "gpt-4.1-mini");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch part details
    const { data: part } = await supabase
      .from("parts")
      .select("*")
      .eq("material", material)
      .single();

    if (!part) throw new Error("Part not found");

    const cats = [];
    if (part.is_mineracao) cats.push("Mineração");
    if (part.is_linha_amarela) cats.push("Linha Amarela");
    if (part.is_perfuratriz) cats.push("Perfuratriz");
    if (part.is_caminhao_eletrico) cats.push("Caminhão Elétrico");
    if (part.is_guindaste) cats.push("Guindaste");

    // Find similar parts by description keywords
    const keywords = part.description.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 3);
    let relatedParts: any[] = [];
    if (keywords.length > 0) {
      const orCond = keywords.map((w: string) => `description.ilike.%${w}%`).join(",");
      const { data } = await supabase
        .from("parts")
        .select("material, description, machine_model, stock, estimated_price")
        .or(orCond)
        .neq("material", material)
        .limit(10);
      relatedParts = data || [];
    }

    const prompt = `Você é um especialista em peças de equipamentos pesados XCMG. Analise esta peça e forneça informações técnicas detalhadas.

Peça:
- Código: ${part.material}
- Descrição: ${part.description}
- Modelo da máquina: ${part.machine_model || "N/A"}
- Fabricante: ${part.manufacturer || "XCMG"}
- Categorias: ${cats.join(", ") || "N/A"}
- Modelos compatíveis cadastrados: ${part.compatible_models?.join(", ") || "Nenhum"}

Peças possivelmente relacionadas no catálogo:
${relatedParts.map((p: any) => `- ${p.material}: ${p.description} (${p.machine_model})`).join("\n")}

Responda em JSON com esta estrutura exata:
{
  "technical_description": "Descrição técnica expandida da peça, sua função e aplicação",
  "probable_function": "Função principal da peça no equipamento",
  "compatible_machines": ["Lista de modelos de máquinas XCMG que provavelmente usam esta peça"],
  "technical_specs": ["Especificação 1", "Especificação 2"],
  "maintenance_tips": "Dicas de manutenção e substituição",
  "related_parts": ["Códigos de peças relacionadas do catálogo que podem ser necessárias junto com esta"]
}`;

    const response = await createOpenAIChatCompletion({
      model,
      messages: [
        { role: "system", content: "Você é um especialista técnico em equipamentos XCMG. Responda SEMPRE em JSON válido." },
        { role: "user", content: prompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "part_analysis",
          description: "Return structured part analysis",
          parameters: {
            type: "object",
            properties: {
              technical_description: { type: "string" },
              probable_function: { type: "string" },
              compatible_machines: { type: "array", items: { type: "string" } },
              technical_specs: { type: "array", items: { type: "string" } },
              maintenance_tips: { type: "string" },
              related_parts: { type: "array", items: { type: "string" } },
            },
            required: ["technical_description", "probable_function", "compatible_machines", "technical_specs", "maintenance_tips", "related_parts"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "part_analysis" } },
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", status, t);
      throw new Error("AI provider error");
    }

    const aiData = await response.json();
    let analysis = extractToolArguments<Record<string, unknown>>(aiData);
    if (!analysis) {
      // Fallback: try to parse content as JSON
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Could not parse AI response" };
    }

    // Add related parts from our catalog
    analysis.catalog_related = relatedParts.slice(0, 5);

    // Save/update AI result to ai_compatibility_results table
    try {
      const upsertData = {
        part_id: part.id,
        material: part.material,
        compatible_machines: analysis.compatible_machines || [],
        technical_description: analysis.technical_description || "",
        probable_function: analysis.probable_function || "",
        technical_specs: analysis.technical_specs || [],
        maintenance_tips: analysis.maintenance_tips || "",
        related_parts: analysis.related_parts || [],
        researched_at: new Date().toISOString(),
        model_used: model,
      };

      const { error: upsertError } = await supabase
        .from("ai_compatibility_results")
        .upsert(upsertData, { onConflict: "material" });

      if (upsertError) {
        console.error("Failed to save AI result:", upsertError);
      }

      // Also save part_category if we can infer it
      if (analysis.probable_function) {
        const CATEGORIES = ["Filtros","Vedações e Retentores","Motor e Componentes","Sistema Hidráulico","Sistema Elétrico","Estrutural e Chassi","Transmissão","Freios","Refrigeração","Rolamentos e Buchas","Acessórios e Outros"];
        const func = analysis.probable_function.toLowerCase();
        let cat = "Acessórios e Outros";
        if (/filtr/i.test(func)) cat = "Filtros";
        else if (/veda|retent|anel|oring|junta/i.test(func)) cat = "Vedações e Retentores";
        else if (/motor|pistão|biela|válvula.*motor|cabeçote/i.test(func)) cat = "Motor e Componentes";
        else if (/hidráulic|cilindro|bomba.*hidráulic|mangueira/i.test(func)) cat = "Sistema Hidráulico";
        else if (/elétr|sensor|relé|alternador|motor.*arranque|chicote/i.test(func)) cat = "Sistema Elétrico";
        else if (/estrutur|chassi|cabine|caçamba|braço|lança/i.test(func)) cat = "Estrutural e Chassi";
        else if (/transmiss|engrenag|eixo|diferencial|embreag/i.test(func)) cat = "Transmissão";
        else if (/freio|pastilha|disco.*freio|sapata/i.test(func)) cat = "Freios";
        else if (/refriger|radiad|ventilad|termostato/i.test(func)) cat = "Refrigeração";
        else if (/rolament|bucha|mancal/i.test(func)) cat = "Rolamentos e Buchas";

        await supabase.from("parts").update({ part_category: cat }).eq("material", part.material);
      }
    } catch (saveErr) {
      console.error("Error saving AI result:", saveErr);
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("part-research error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
