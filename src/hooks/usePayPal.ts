import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PAYPAL_CLIENT_ID = "AetPmdLcTL5KAJx6hYvo6K2NtAvaevJ2vTn0jxdc1hOE6X7pCmP6jMK3hrgSEUqN5xviMWUPTRe7uGqG";

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

      // Call edge function to create PayPal order
      const { data: orderData, error: fnError } = await supabase.functions.invoke("paypal-payment", {
        body: {
          action: "create-order",
          amount: options.amount,
          currency: options.currency || "MAD",
          description: options.description,
          transactionId: txn.id,
        },
      });

      if (fnError) throw fnError;
      if (orderData?.error) throw new Error(orderData.error);

      return { transactionId: txn.id, orderId: orderData.orderId, approveUrl: orderData.approveUrl };
    } catch (err: any) {
      toast.error(err.message || "خطأ في إنشاء معاملة PayPal");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const capturePayment = useCallback(async (transactionId: string, paypalOrderId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paypal-payment", {
        body: {
          action: "capture-order",
          orderId: paypalOrderId,
          transactionId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.status === "completed") {
        toast.success("تم الدفع بنجاح عبر PayPal ✅");
        return true;
      }
      toast.error("فشل تأكيد الدفع");
      return false;
    } catch (err: any) {
      toast.error(err.message || "خطأ في تأكيد الدفع");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Legacy compat
  const completePayment = capturePayment;

  return { init, ready, loading, createPayment, capturePayment, completePayment };
}
