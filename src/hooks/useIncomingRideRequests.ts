import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { acceptOrder, rejectOrder, subscribeDriverPendingOrders, type OrderRecord } from '@/lib/orderService';
import { auth } from '@/lib/firebase';

export interface RideRequest {
  id: string;
  user_id: string;
  pickup: string;
  destination: string;
  price: number | null;
  status: string;
  created_at: string;
  passenger_name?: string;
  passenger_phone?: string;
  type?: string;
}

const mapOrderToRequest = (order: OrderRecord): RideRequest => ({
  id: order.id,
  user_id: order.clientId,
  pickup: order.pickupAddress,
  destination: order.deliveryAddress,
  price: order.price,
  status: order.status,
  created_at: order.createdAt?.toDate ? order.createdAt.toDate().toISOString() : new Date(order.createdAt || Date.now()).toISOString(),
  passenger_name: order.clientName,
  passenger_phone: order.clientPhone,
  type: order.type,
});

export function useIncomingRideRequests(isOnline: boolean) {
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!isOnline || !auth.currentUser) {
      setRequests([]);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeDriverPendingOrders(auth.currentUser.uid, (orders) => {
      setRequests(orders.map(mapOrderToRequest));
      setLoading(false);
    });

    return unsubscribe;
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline || !auth.currentUser) {
      setRequests([]);
      return;
    }

    const unsubscribePromise = fetchRequests();

    return () => {
      Promise.resolve(unsubscribePromise).then((unsubscribe) => unsubscribe?.());
    };
  }, [fetchRequests, isOnline]);

  const acceptRequest = useCallback(async (request: RideRequest) => {
    const user = auth.currentUser;
    if (!user) {
      toast({ title: 'غير مسجل الدخول', variant: 'destructive' });
      return;
    }

    setAccepting(request.id);
    try {
      await acceptOrder(request.id, user.uid);
      toast({
        title: 'تم قبول الطلب ✅',
        description: `من ${request.pickup} إلى ${request.destination}`,
      });
      setRequests((prev) => prev.filter((item) => item.id !== request.id));
    } catch (err: any) {
      toast({
        title: 'خطأ',
        description: err.message || 'فشل قبول الطلب',
        variant: 'destructive',
      });
    } finally {
      setAccepting(null);
    }
  }, []);

  const rejectRequest = useCallback(async (requestId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    await rejectOrder(requestId, user.uid);
    setRequests((prev) => prev.filter((item) => item.id !== requestId));
  }, []);

  return { requests, loading, accepting, acceptRequest, rejectRequest, fetchRequests };
}
