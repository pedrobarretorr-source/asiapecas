import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type QuoteRequest = {
  id: string;
  customer_name: string;
  company: string | null;
  cnpj_cpf: string | null;
  email: string | null;
  phone: string | null;
  items: any;
  notes: string | null;
  status: string;
  created_at: string;
  converted_sale_id: string | null;
};

export function useQuoteRequests() {
  return useQuery({
    queryKey: ["quote_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as QuoteRequest[];
    },
  });
}

export function useConvertQuoteToSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quote: QuoteRequest) => {
      // 1. Find or create customer
      let customerId: string | null = null;
      if (quote.email) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("email", quote.email)
          .maybeSingle();
        if (existing) {
          customerId = existing.id;
        } else {
          const { data: created, error: custErr } = await supabase
            .from("customers")
            .insert({
              name: quote.customer_name,
              company: quote.company,
              cnpj_cpf: quote.cnpj_cpf,
              email: quote.email,
              phone: quote.phone,
              source: "portal",
            })
            .select("id")
            .single();
          if (custErr) throw custErr;
          customerId = created.id;
        }
      }

      // 2. Resolve part_ids and prices from materials
      const quoteItems = Array.isArray(quote.items) ? quote.items : [];
      const materials = quoteItems.map((i: any) => i.material).filter(Boolean);
      const { data: partsData } = await supabase
        .from("parts")
        .select("id, material, estimated_price")
        .in("material", materials);
      const partsMap = new Map((partsData || []).map(p => [p.material, p]));

      const saleItems = quoteItems.map((i: any) => {
        const part = partsMap.get(i.material);
        return {
          part_id: part?.id || null,
          quantity: i.quantity || 1,
          unit_price: part?.estimated_price || 0,
        };
      });
      const totalAmount = saleItems.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0);

      // 3. Create sale
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          customer_id: customerId,
          status: "orcamento",
          total_amount: totalAmount,
          notes: `Convertido da cotação do portal. ${quote.notes || ""}`.trim(),
        })
        .select("id")
        .single();
      if (saleErr) throw saleErr;

      // 4. Create sale items
      if (saleItems.length > 0) {
        const { error: itemsErr } = await supabase.from("sale_items").insert(
          saleItems.map((i: any) => ({
            sale_id: sale.id,
            part_id: i.part_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            total_price: i.quantity * i.unit_price,
          }))
        );
        if (itemsErr) throw itemsErr;
      }

      // 5. Update quote_request status
      await supabase
        .from("quote_requests")
        .update({ status: "convertido", converted_sale_id: sale.id } as any)
        .eq("id", quote.id);

      return sale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote_requests"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Cotação convertida em orçamento!");
    },
    onError: (e: Error) => toast.error("Erro ao converter: " + e.message),
  });
}
