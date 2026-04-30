import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AfterSale = {
  id: string;
  sale_id: string | null;
  customer_id: string | null;
  type: string;
  status: string;
  description: string;
  resolution: string | null;
  priority: string;
  created_at: string;
  resolved_at: string | null;
  customers?: { name: string; company: string | null } | null;
  sales?: { id: string; total_amount: number } | null;
};

export type AfterSaleInsert = {
  sale_id?: string | null;
  customer_id: string | null;
  type: string;
  priority: string;
  description: string;
};

export function useAfterSales(statusFilter?: string) {
  return useQuery({
    queryKey: ["after_sales", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("after_sales")
        .select("*, customers(name, company), sales(id, total_amount)")
        .order("created_at", { ascending: false });
      if (statusFilter && statusFilter !== "todos") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as AfterSale[];
    },
  });
}

export function useCreateAfterSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticket: AfterSaleInsert) => {
      const { data, error } = await supabase.from("after_sales").insert(ticket).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["after_sales"] });
      toast.success("Ticket criado com sucesso");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateAfterSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AfterSale> & { id: string }) => {
      const { customers, sales, ...dbUpdates } = updates as any;
      const { error } = await supabase.from("after_sales").update(dbUpdates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["after_sales"] });
      toast.success("Ticket atualizado");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
