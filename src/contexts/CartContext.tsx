import React, { createContext, useContext, useState, useCallback } from "react";

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  storeId: string;
  storeName: string;
}

interface CartContextType {
  items: CartItem[];
  storeId: string | null;
  storeName: string | null;
  addItem: (item: Omit<CartItem, "id" | "quantity">, quantity?: number) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);

  const addItem = useCallback((item: Omit<CartItem, "id" | "quantity">, quantity = 1) => {
    setItems((prev) => {
      // If different store, clear cart
      if (storeId && item.storeId !== storeId) {
        setStoreId(item.storeId);
        setStoreName(item.storeName);
        return [{ ...item, id: crypto.randomUUID(), quantity }];
      }
      if (!storeId) {
        setStoreId(item.storeId);
        setStoreName(item.storeName);
      }
      const existing = prev.find((i) => i.menuItemId === item.menuItemId);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...item, id: crypto.randomUUID(), quantity }];
    });
  }, [storeId]);

  const removeItem = useCallback((menuItemId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.menuItemId !== menuItemId);
      if (next.length === 0) { setStoreId(null); setStoreName(null); }
      return next;
    });
  }, []);

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    if (quantity <= 0) return removeItem(menuItemId);
    setItems((prev) => prev.map((i) => i.menuItemId === menuItemId ? { ...i, quantity } : i));
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    setStoreId(null);
    setStoreName(null);
  }, []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, storeId, storeName, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};
