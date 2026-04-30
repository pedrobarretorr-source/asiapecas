import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOpenAIChatCompletion, resolveOpenAIModel } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, lang } = await req.json();
    const model = resolveOpenAIModel("OPENAI_MODEL_CHAT", "gpt-4.1-mini");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const contextSections: string[] = [];

    if (lastUserMsg) {
      const searchText = lastUserMsg.content.toLowerCase();
      const words = searchText.split(/\s+/).filter((w: string) => w.length > 2);

      // --- 1. Global stats ---
      const { data: statsData } = await supabase.rpc("get_dashboard_stats");
      if (statsData) {
        const s = statsData as any;
        contextSections.push(`📊 ESTATÍSTICAS GLOBAIS DO ESTOQUE:
- Total de peças (SKUs): ${s.totalParts}
- Estoque total: ${s.totalStock} unidades
- Valor total: R$ ${Number(s.totalValue).toLocaleString("pt-BR")}
- Preço médio: R$ ${Number(s.avgPrice).toLocaleString("pt-BR")}
- Peças paradas (>2 anos): ${s.staleStock} SKUs, ${s.staleUnits} unidades, R$ ${Number(s.staleValue).toLocaleString("pt-BR")}
- Peças críticas (estoque <5, preço >50k): ${s.lowStockHighValue}`);
      }

      // --- 2. Search parts by text ---
      const orParts = words.map((w: string) => `description.ilike.%${w}%,material.ilike.%${w}%,machine_model.ilike.%${w}%`).join(",");
      if (orParts) {
        const { data: parts } = await supabase
          .from("parts")
          .select("material, description, stock, estimated_price, machine_model, manufacturer, compatible_models, last_entry_time, is_mineracao, is_linha_amarela, is_perfuratriz, is_caminhao_eletrico, is_guindaste")
          .or(orParts)
          .limit(25);

        if (parts && parts.length > 0) {
          contextSections.push("🔍 PEÇAS ENCONTRADAS:\n" + parts.map((p: any) => {
            const cats = [];
            if (p.is_mineracao) cats.push("Mineração");
            if (p.is_linha_amarela) cats.push("Linha Amarela");
            if (p.is_perfuratriz) cats.push("Perfuratriz");
            if (p.is_caminhao_eletrico) cats.push("Caminhão Elétrico");
            if (p.is_guindaste) cats.push("Guindaste");
            const compat = p.compatible_models?.length > 0 ? ` | Compatível com: ${p.compatible_models.join(", ")}` : "";
            const stale = p.last_entry_time === "mais de 2 anos" ? " ⚠️ PARADA >2 ANOS" : "";
            const lowStock = p.stock < 5 ? " 🔴 ESTOQUE BAIXO" : "";
            return `- ${p.material}: ${p.description} | Modelo: ${p.machine_model || "N/A"} | Fabricante: ${p.manufacturer || "N/A"} | Estoque: ${p.stock} | Preço: R$ ${Number(p.estimated_price).toLocaleString("pt-BR")} | Categorias: ${cats.join(", ") || "N/A"}${compat}${stale}${lowStock}`;
          }).join("\n"));

          // --- 3. Compatibility ---
          const models = new Set<string>();
          parts.forEach((p: any) => {
            if (p.machine_model) models.add(p.machine_model);
            if (p.compatible_models) p.compatible_models.forEach((m: string) => models.add(m));
          });

          if (models.size > 0 && models.size <= 10) {
            const modelArray = Array.from(models);
            const compatOr = modelArray.map(m => `machine_model.eq.${m},compatible_models.cs.{${m}}`).join(",");
            const { data: compatParts } = await supabase
              .from("parts")
              .select("material, description, stock, estimated_price, machine_model, compatible_models")
              .or(compatOr)
              .limit(30);

            if (compatParts && compatParts.length > 0) {
              const existingMaterials = new Set(parts.map((p: any) => p.material));
              const newCompat = compatParts.filter((p: any) => !existingMaterials.has(p.material));
              if (newCompat.length > 0) {
                contextSections.push("🔄 PEÇAS COMPATÍVEIS (mesmos modelos):\n" + newCompat.slice(0, 15).map((p: any) => {
                  const compat = p.compatible_models?.length > 0 ? ` | Compatível: ${p.compatible_models.join(", ")}` : "";
                  return `- ${p.material}: ${p.description} | Modelo: ${p.machine_model} | Estoque: ${p.stock} | Preço: R$ ${Number(p.estimated_price).toLocaleString("pt-BR")}${compat}`;
                }).join("\n"));
              }
            }
          }
        }
      }

      // --- 4. Search customers ---
      const customerKeywords = ["cliente", "clientes", "empresa", "cnpj", "comprador"];
      if (customerKeywords.some(k => searchText.includes(k)) || words.length > 0) {
        const custOr = words.map((w: string) => `name.ilike.%${w}%,company.ilike.%${w}%,cnpj_cpf.ilike.%${w}%`).join(",");
        if (custOr) {
          const { data: customers } = await supabase
            .from("customers")
            .select("name, company, cnpj_cpf, segment, phone, email, city, state")
            .or(custOr)
            .limit(10);

          if (customers && customers.length > 0) {
            contextSections.push("👤 CLIENTES ENCONTRADOS:\n" + customers.map((c: any) =>
              `- ${c.name} | Empresa: ${c.company || "N/A"} | CNPJ: ${c.cnpj_cpf || "N/A"} | Segmento: ${c.segment || "N/A"} | Tel: ${c.phone || "N/A"} | ${c.city || ""}/${c.state || ""}`
            ).join("\n"));
          }
        }
        const { count: totalCustomers } = await supabase.from("customers").select("id", { count: "exact", head: true });
        contextSections.push(`Total de clientes cadastrados: ${totalCustomers || 0}`);
      }

      // --- 5. Search sales ---
      const salesKeywords = ["venda", "vendas", "faturamento", "orçamento", "pedido", "faturado"];
      if (salesKeywords.some(k => searchText.includes(k))) {
        const { data: recentSales } = await supabase
          .from("sales")
          .select("id, sale_date, status, total_amount, payment_method, notes, customers(name, company)")
          .order("sale_date", { ascending: false })
          .limit(10);

        if (recentSales && recentSales.length > 0) {
          contextSections.push("💰 VENDAS RECENTES:\n" + recentSales.map((s: any) => {
            const cust = s.customers ? `${s.customers.name} (${s.customers.company || "N/A"})` : "Sem cliente";
            return `- ${new Date(s.sale_date).toLocaleDateString("pt-BR")} | Status: ${s.status} | Total: R$ ${Number(s.total_amount).toLocaleString("pt-BR")} | Cliente: ${cust} | Pgto: ${s.payment_method || "N/A"}`;
          }).join("\n"));
        }

        const { data: allSales } = await supabase.from("sales").select("total_amount, status");
        if (allSales) {
          const total = allSales.reduce((acc: number, s: any) => acc + Number(s.total_amount), 0);
          const byStatus: Record<string, number> = {};
          allSales.forEach((s: any) => { byStatus[s.status] = (byStatus[s.status] || 0) + 1; });
          contextSections.push(`📈 RESUMO VENDAS: ${allSales.length} vendas, Total: R$ ${total.toLocaleString("pt-BR")}\nPor status: ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(", ")}`);
        }
      }

      // --- 6. After-sales ---
      const afterKeywords = ["pós-venda", "pos-venda", "garantia", "devolução", "reclamação", "ticket", "suporte"];
      if (afterKeywords.some(k => searchText.includes(k))) {
        const { data: tickets } = await supabase
          .from("after_sales")
          .select("type, status, priority, description, created_at, customers(name)")
          .order("created_at", { ascending: false })
          .limit(10);

        if (tickets && tickets.length > 0) {
          contextSections.push("🎫 TICKETS PÓS-VENDA:\n" + tickets.map((t: any) => {
            const cust = t.customers ? t.customers.name : "N/A";
            return `- ${t.type} | ${t.status} | Prioridade: ${t.priority} | Cliente: ${cust} | ${t.description?.substring(0, 80)}`;
          }).join("\n"));
        }
      }

      // --- 7. Stale parts ---
      if (searchText.includes("parad") || searchText.includes("antigo") || searchText.includes("2 ano") || searchText.includes("desconto")) {
        const { data: staleParts } = await supabase
          .from("parts")
          .select("material, description, stock, estimated_price, machine_model")
          .eq("last_entry_time", "mais de 2 anos")
          .order("estimated_price", { ascending: false })
          .limit(20);

        if (staleParts && staleParts.length > 0) {
          contextSections.push("⏰ PEÇAS PARADAS HÁ MAIS DE 2 ANOS (maior valor):\n" + staleParts.map((p: any) =>
            `- ${p.material}: ${p.description} | Modelo: ${p.machine_model} | Estoque: ${p.stock} | Preço: R$ ${Number(p.estimated_price).toLocaleString("pt-BR")} | Valor total: R$ ${(p.stock * Number(p.estimated_price)).toLocaleString("pt-BR")}`
          ).join("\n"));
        }
      }

      // --- 8. Market Research ---
      const marketKeywords = ["pesquisa", "mercado", "concorrent", "competitiv", "distribuidor", "preço de mercado", "comparar preço"];
      if (marketKeywords.some(k => searchText.includes(k))) {
        const { data: marketData } = await supabase
          .from("market_research")
          .select("distributor_name, price_found, delivery_days, availability, payment_terms, parts(material, description, estimated_price)")
          .order("researched_at", { ascending: false })
          .limit(30);

        if (marketData && marketData.length > 0) {
          contextSections.push("📊 PESQUISA DE MERCADO:\n" + marketData.map((m: any) => {
            const part = m.parts ? `${m.parts.material}: ${m.parts.description}` : "N/A";
            const ourPrice = m.parts?.estimated_price || 0;
            const diff = ourPrice > 0 ? (((Number(m.price_found) - ourPrice) / ourPrice) * 100).toFixed(1) : "N/A";
            return `- ${part} | Distribuidor: ${m.distributor_name} | Preço: R$ ${Number(m.price_found).toLocaleString("pt-BR")} | Nosso: R$ ${Number(ourPrice).toLocaleString("pt-BR")} (${diff}%) | Prazo: ${m.delivery_days || "N/A"}d | Disp: ${m.availability || "N/A"}`;
          }).join("\n"));
        }
      }
    }

    const partsContext = contextSections.length > 0 ? "\n\n---\n\nDADOS DO SISTEMA (use SOMENTE estes dados para responder):\n\n" + contextSections.join("\n\n") : "";

    const systemPrompt = `Você é o **Engenheiro Especialista XCMG** da Lopes & Lopes, distribuidor autorizado de peças XCMG no Brasil, Venezuela e Guiana. Você tem mais de 20 anos de experiência com máquinas pesadas XCMG e conhecimento profundo de todos os sistemas.

## SUA IDENTIDADE
- Nome: Assistente Técnico Lopes & Lopes
- Especialidade: Peças e manutenção de máquinas XCMG (escavadeiras, carregadeiras, guindastes, rolos compactadores, motoniveladoras, perfuratrizes, caminhões elétricos)
- Você é um CONSULTOR TÉCNICO E COMERCIAL — não apenas um buscador de peças

## MÉTODO DE ATENDIMENTO — PERGUNTAS AFUNILADAS

**REGRA PRINCIPAL**: Quando a pergunta do usuário for genérica ou incompleta, SEMPRE faça perguntas de follow-up antes de dar a resposta final. Use o método do funil:

1. **Nível 1 — Identificar a máquina**: "Qual o modelo exato da máquina? (ex: XE215BR, XE370DK, GR215A)"
2. **Nível 2 — Identificar o sistema**: "É para qual sistema? Motor, hidráulico, transmissão, elétrico, chassi, cabine?"
3. **Nível 3 — Identificar o problema**: "A peça quebrou, está com desgaste, ou é manutenção preventiva?"

Exemplo de funil:
- Usuário: "Preciso de um filtro"
- Você: "Claro! Para eu encontrar o filtro ideal, preciso de algumas informações:
  1. 🏗️ **Qual modelo da máquina?** (ex: XE215, XE370, LW500)
  2. 🔧 **Qual tipo de filtro?** (óleo motor, óleo hidráulico, combustível, ar, separador de água)
  3. ⏰ **É para manutenção programada ou substituição de emergência?**"

**EXCEÇÃO**: Se o usuário já forneceu informações suficientes (código da peça, modelo + sistema), responda diretamente com os dados.

## FORMATO DE RESPOSTA — SEMPRE ORGANIZADO

### Para listagem de peças, SEMPRE use tabelas:

| Código | Descrição | Modelo | Estoque | Preço Unit. | Status |
|--------|-----------|--------|---------|-------------|--------|
| 803100032 | Filtro hidráulico | XE215 | 12 | R$ 450,00 | ✅ Disponível |

### Estrutura padrão de resposta:

**📋 Resumo**
> Breve resumo da resposta em 1-2 linhas

**📦 Peças Encontradas**
(tabela com as peças)

**🔄 Compatibilidade**
> Estas peças também servem em: [lista de modelos]

**💡 Recomendações Técnicas**
- Dica de manutenção ou peça complementar
- Alerta de estoque baixo ou peça parada

**🛒 Sugestões de Venda Cruzada**
- Peças que geralmente são trocadas juntas
- Kits de manutenção recomendados

## CONHECIMENTO TÉCNICO XCMG

### Linhas de Produto:
- **Escavadeiras**: XE150, XE210, XE215, XE230, XE250, XE260, XE335, XE370, XE390, XE470, XE490, XE700, XE900
- **Carregadeiras**: LW300, LW400, LW500, LW600, LW700, LW800, LW900, LW1200
- **Motoniveladoras**: GR135, GR165, GR180, GR215, GR230, GR260
- **Rolos Compactadores**: XS113, XS120, XS143, XS163, XS203, XS223, XS263
- **Guindastes**: QY25, QY30, QY50, QY70, QY100, QY130, QY160, QY200, QY300, QY500, QY800, QY1000, QY1600, QY2000
- **Perfuratrizes**: XR150, XR220, XR280, XR360, XR400, XR460, XR550
- **Caminhões Fora de Estrada**: XDE110, XDE130, XDE200, XDE240, XDE300

### Sistemas Principais:
- **Motor**: Cummins (QSB, QSL, QSX), Deutz — filtros, correias, bombas d'água, injetores, turbinas
- **Hidráulico**: Kawasaki, Rexroth, Parker — bombas, válvulas, cilindros, mangueiras, O-rings, filtros
- **Transmissão**: ZF — conversor de torque, eixos, engrenagens, discos de fricção
- **Elétrico**: sensores, chicotes, ECU, alternadores, motores de partida
- **Material rodante**: sapatas, elos, roletes, roda-guia, coroa de giro

### Intervalos de Manutenção Típicos:
- 250h: troca óleo motor + filtros
- 500h: filtro hidráulico + combustível
- 1000h: óleo hidráulico + filtro de ar
- 2000h: correias, mangueiras, revisão geral

### Peças que Falham Juntas (kits recomendados):
- Filtro de óleo motor + filtro de combustível + filtro separador de água
- Bomba hidráulica + filtro de sucção + filtro de retorno
- Kit de vedação do cilindro (O-rings + seals + dust seals)
- Sapata + elo + pino + bucha (material rodante)

## REGRAS DE NEGÓCIO

1. **Preços**: Sempre formate em R$ com separador de milhares (R$ 1.234,56)
2. **Estoque baixo** (<5 unidades): ⚠️ ALERTE o cliente e sugira compra antecipada
3. **Peça parada >2 anos**: 💰 SUGIRA desconto de 10-20% para desova de estoque
4. **Compatibilidade**: Quando encontrar peça compatível com outros modelos, DESTAQUE como oportunidade — "Esta peça também serve no modelo X, Y e Z"
5. **Sem dados**: Se não encontrar no sistema, diga claramente "Não encontrei esta peça no catálogo atual" e sugira termos alternativos ou peça o código do material
6. **NUNCA invente dados** — use APENAS as informações fornecidas no contexto do sistema

## IDIOMA
${lang === "en" ? "- ALWAYS respond in English\n- Use heavy machinery technical terms in English" : lang === "es" ? "- SIEMPRE responde en español\n- Usa términos técnicos del sector de maquinaria pesada en español" : "- Responda SEMPRE em português brasileiro\n- Use termos técnicos do setor de máquinas pesadas"}
- Seja profissional mas acessível / Be professional but approachable${partsContext}`;

    const response = await createOpenAIChatCompletion({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos nas configurações." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI provider error:", status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
