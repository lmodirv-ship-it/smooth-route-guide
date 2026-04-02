import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// PayPal client-side integration
// Uses PayPal's client-side SDK for payment processing

const PAYPAL_CLIENT_ID = "sb"; // sandbox - replace with live client ID in production

let sdkLoaded = false;
let sdkPromise: Promise<void> | null = null;

function loadPayPalSDK(): Promise<void> {
  if (sdkLoaded) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
    script.async = true;
    script.onload = () => { sdkLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("Failed to load PayPal SDK"));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

interface PayPalPaymentOptions {
  amount: number;
  currency?: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
}

export function usePayPal() {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(sdkLoaded);

  const init = useCallback(async () => {
    try {
      await loadPayPalSDK();
      setReady(true);
    } catch {
      toast.error("فشل تحميل PayPal SDK");
    }
  }, []);

  const createPayment = useCallback(async (options: PayPalPaymentOptions) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Record pending transaction
      const { data: txn, error } = await supabase.from("payment_transactions").insert({
        user_id: user.id,
        amount: options.amount,
        currency: options.currency || "MAD",
        transaction_type: "payment",
        payment_method: "paypal",
        provider: "paypal",
        status: "pending",
        reference_type: options.referenceType || null,
        reference_id: options.referenceId || null,
        metadata: { description: options.description },
      }).select("id").single();
      
      if (error) throw error;

      return txn.id;
    } catch (err: any) {
      toast.error(err.message || "خطأ في إنشاء معاملة PayPal");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const completePayment = useCallback(async (transactionId: string, paypalOrderId: string) => {
    try {
      await supabase.from("payment_transactions").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        metadata: { paypal_order_id: paypalOrderId },
      }).eq("id", transactionId);
      
      toast.success("تم الدفع بنجاح عبر PayPal ✅");
      return true;
    } catch {
      toast.error("خطأ في تأكيد الدفع");
      return false;
    }
  }, []);

  return { init, ready, loading, createPayment, completePayment };
}
