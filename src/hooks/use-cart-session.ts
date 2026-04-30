import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type CartItem = { material: string; description: string; quantity: number };

function getSessionId(): string {
  let id = localStorage.getItem("quote_cart_session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("quote_cart_session", id);
  }
  return id;
}

export function useCartSession() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const sessionId = useRef(getSessionId());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load cart from backend on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cart_sessions")
        .select("items")
        .eq("session_id", sessionId.current)
        .maybeSingle();
      if (data?.items && Array.isArray(data.items)) {
        setItems(data.items as unknown as CartItem[]);
      }
      setLoaded(true);
    })();
  }, []);

  // Persist to backend (debounced)
  const persist = useCallback((newItems: CartItem[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await supabase.from("cart_sessions").upsert(
        { session_id: sessionId.current, items: newItems as any, updated_at: new Date().toISOString() },
        { onConflict: "session_id" }
      );
    }, 500);
  }, []);

  const updateItems = useCallback((fn: (prev: CartItem[]) => CartItem[]) => {
    setItems(prev => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  const addToCart = useCallback((part: { material: string; description: string }) => {
    updateItems(prev => {
      if (prev.find(i => i.material === part.material)) return prev;
      return [...prev, { material: part.material, description: part.description, quantity: 1 }];
    });
  }, [updateItems]);

  const updateQty = useCallback((material: string, qty: number) => {
    updateItems(prev => prev.map(i => i.material === material ? { ...i, quantity: Math.max(1, qty) } : i));
  }, [updateItems]);

  const removeItem = useCallback((material: string) => {
    updateItems(prev => prev.filter(i => i.material !== material));
  }, [updateItems]);

  const clearCart = useCallback(() => {
    updateItems(() => []);
  }, [updateItems]);

  return { items, addToCart, updateQty, removeItem, clearCart, loaded };
}
