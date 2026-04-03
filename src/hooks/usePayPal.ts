import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PayPalPaymentOptions {
  amount: number;
  currency?: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
}

export function usePayPal() {
  const [loading, setLoading] = useState(false);

  const createPayment = useCallback(async (options: PayPalPaymentOptions) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paypal-live", {
        body: {
          action: "create-order",
          amount: options.amount,
          currency: options.currency || "MAD",
          description: options.description,
          referenceType: options.referenceType || null,
          referenceId: options.referenceId || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return {
        transactionId: data.transactionId,
        orderId: data.orderId,
        approveUrl: data.approveUrl,
      };
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
      const { data, error } = await supabase.functions.invoke("paypal-live", {
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

  const completePayment = capturePayment;

  return { loading, createPayment, capturePayment, completePayment };
}
