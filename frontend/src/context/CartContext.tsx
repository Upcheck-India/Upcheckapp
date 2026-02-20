import React, { createContext, useContext, useState, useCallback } from 'react';
import { CartItem, Coupon, Product } from '../services/mockProductService';

interface CartContextType {
    items: CartItem[];
    coupon: Coupon | null;
    addItem: (product: Product, qty?: number) => void;
    removeItem: (productId: string) => void;
    updateQty: (productId: string, qty: number) => void;
    clearCart: () => void;
    setCoupon: (coupon: Coupon | null) => void;
    totalItems: number;
    subtotal: number;
}

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<CartItem[]>([]);
    const [coupon, setCouponState] = useState<Coupon | null>(null);

    const addItem = useCallback((product: Product, qty = 1) => {
        setItems(prev => {
            const existing = prev.find(ci => ci.product.id === product.id);
            if (existing) {
                return prev.map(ci => ci.product.id === product.id ? { ...ci, qty: ci.qty + qty } : ci);
            }
            return [...prev, { product, qty }];
        });
    }, []);

    const removeItem = useCallback((productId: string) => {
        setItems(prev => prev.filter(ci => ci.product.id !== productId));
    }, []);

    const updateQty = useCallback((productId: string, qty: number) => {
        if (qty <= 0) {
            setItems(prev => prev.filter(ci => ci.product.id !== productId));
        } else {
            setItems(prev => prev.map(ci => ci.product.id === productId ? { ...ci, qty } : ci));
        }
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
        setCouponState(null);
    }, []);

    const setCoupon = useCallback((c: Coupon | null) => setCouponState(c), []);

    const totalItems = items.reduce((s, ci) => s + ci.qty, 0);
    const subtotal = items.reduce((s, ci) => s + ci.product.price * ci.qty, 0);

    return (
        <CartContext.Provider value={{ items, coupon, addItem, removeItem, updateQty, clearCart, setCoupon, totalItems, subtotal }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used inside CartProvider');
    return ctx;
};
