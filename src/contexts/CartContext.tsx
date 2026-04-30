import { createContext, useContext, useState, type ReactNode } from "react";

export type CartItem = {
  part_id: string;
  material: string;
  description: string;
  quantity: number;
  unit_price: number;
  stock: number;
};

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (partId: string) => void;
  updateQuantity: (partId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
    setItems(prev => {
      const existing = prev.find(i => i.part_id === item.part_id);
      if (existing) {
        return prev.map(i =>
          i.part_id === item.part_id
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  };

  const removeItem = (partId: string) => {
    setItems(prev => prev.filter(i => i.part_id !== partId));
  };

  const updateQuantity = (partId: string, quantity: number) => {
    setItems(prev => prev.map(i => i.part_id === partId ? { ...i, quantity: Math.max(1, quantity) } : i));
  };

  const clearCart = () => setItems([]);
  const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
