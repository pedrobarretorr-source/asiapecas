import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SaleItem = {
  id: string;
  sale_id: string;
  part_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  parts?: { material: string; description: string } | null;
};

export type Sale = {
  id: string;
  customer_id: string | null;
  sale_date: string;
  status: string;
  total_amount: number;
  payment_method: string | null;
  payment_terms: string | null;
  notes: string | null;
  created_at: string;
  customers?: { name: string; company: string | null } | null;
  sale_items?: SaleItem[];
};

export type SaleInsert = {
  customer_id: string | null;
  status?: string;
  payment_method?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
  items: { part_id: string; quantity: number; unit_price: number }[];
};

export function useSales(statusFilter?: string) {
  return useQuery({
    queryKey: ["sales", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("sales")
        .select("*, customers(name, company), sale_items(*, parts(material, description))")
        .order("created_at", { ascending: false });
      if (statusFilter && statusFilter !== "todos") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Sale[];
    },
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ items, ...saleData }: SaleInsert) => {
      const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const { data: sale, error } = await supabase
        .from("sales")
        .insert({ ...saleData, total_amount: total })
        .select()
        .single();
      if (error) throw error;

      const saleItems = items.map((i) => ({
        sale_id: sale.id,
        part_id: i.part_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.quantity * i.unit_price,
      }));
      const { error: itemsErr } = await supabase.from("sale_items").insert(saleItems);
      if (itemsErr) throw itemsErr;
      return sale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venda criada com sucesso");
    },
    onError: (e: Error) => toast.error("Erro ao criar venda: " + e.message),
  });
}

export function useUpdateSaleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("sales").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Status atualizado");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venda removida");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
