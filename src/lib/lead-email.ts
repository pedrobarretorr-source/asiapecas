import { supabase } from "@/integrations/supabase/client";

type LeadEmailPayload = {
  type: "quote_request" | "quote_cart" | "b2b_lead";
  title: string;
  fields: Record<string, unknown>;
  items?: Array<Record<string, unknown>>;
  notes?: string | null;
  utm?: unknown;
};

export async function notifyLeadEmail(payload: LeadEmailPayload) {
  try {
    const { error } = await supabase.functions.invoke("send-lead-email", {
      body: payload,
    });

    if (error) {
      console.warn("Lead email notification failed", error);
    }
  } catch (error) {
    console.warn("Lead email notification failed", error);
  }
}
