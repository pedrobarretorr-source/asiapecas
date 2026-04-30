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
    const { materials } = await req.json();
    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      throw new Error("materials array is required");
    }

    const model = resolveOpenAIModel("OPENAI_MODEL_BATCH_AI_RESEARCH", "gpt-4.1-mini");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch parts that don't have AI results yet
    const { data: parts, error: partsError } = await supabase
      .from("parts")
      .select("id, material, description, machine_model, manufacturer, is_mineracao, is_linha_amarela, is_perfuratriz, is_caminhao_eletrico, is_guindaste, compatible_models")
      .in("material", materials);

    if (partsError) throw partsError;
    if (!parts || parts.length === 0) {
      return new Response(JSON.stringify({ processed: 0, skipped: 0, errors: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check which already have results
    const { data: existing } = await supabase
      .from("ai_compatibility_results")
      .select("material")
      .in("material", parts.map(p => p.material));

    const existingMaterials = new Set((existing || []).map((e: any) => e.material));
    const toProcess = parts.filter(p => !existingMaterials.has(p.material));

    let processed = 0;
    let errors = 0;
    const skipped = parts.length - toProcess.length;

    for (const part of toProcess) {
      try {
        const cats = [];
        if (part.is_mineracao) cats.push("Mineração");
        if (part.is_linha_amarela) cats.push("Linha Amarela");
        if (part.is_perfuratriz) cats.push("Perfuratriz");
        if (part.is_caminhao_eletrico) cats.push("Caminhão Elétrico");
        if (part.is_guindaste) cats.push("Guindaste");

        const prompt = `Analise esta peça XCMG brevemente:
- Código: ${part.material}
- Descrição: ${part.description}
- Modelo: ${part.machine_model || "N/A"}
- Fabricante: ${part.manufacturer || "XCMG"}
- Categorias: ${cats.join(", ") || "N/A"}
- Modelos compatíveis: ${part.compatible_models?.join(", ") || "Nenhum"}`;

        const response = await createOpenAIChatCompletion({
          model,
          messages: [
            { role: "system", content: "Você é especialista em peças XCMG. Responda de forma concisa." },
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
          if (response.status === 429) {
            // Rate limited, wait and retry
            await new Promise(r => setTimeout(r, 5000));
            errors++;
            continue;
          }
          errors++;
          continue;
        }

        const aiData = await response.json();
        let analysis = extractToolArguments<Record<string, unknown>>(aiData);
        if (!analysis) {
          const content = aiData.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }

        if (analysis) {
          await supabase.from("ai_compatibility_results").upsert({
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
          }, { onConflict: "material" });
          processed++;
        } else {
          errors++;
        }

        // Small delay between calls
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`Error processing ${part.material}:`, err);
        errors++;
      }
    }

    return new Response(JSON.stringify({ processed, skipped, errors, total: parts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("batch-ai-research error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
