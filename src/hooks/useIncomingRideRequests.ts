import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

export function useIncomingRideRequests(isOnline: boolean) {
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!isOnline) {
      setRequests([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    setRequests(
      (data || []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        pickup: r.pickup,
        destination: r.destination,
        price: r.price,
        status: r.status,
        created_at: r.created_at,
      }))
    );
    setLoading(false);
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline) {
      setRequests([]);
      return;
    }
    fetchRequests();

    const channel = supabase
      .channel('ride-requests-driver')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ride_requests', filter: 'status=eq.pending' },
        () => { fetchRequests(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchRequests, isOnline]);

  const acceptRequest = useCallback(async (request: RideRequest) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'غير مسجل الدخول', variant: 'destructive' });
      return;
    }

    setAccepting(request.id);
    try {
      const { error } = await supabase
        .from('ride_requests')
        .update({ status: 'accepted', driver_id: user.id, accepted_at: new Date().toISOString() })
        .eq('id', request.id)
        .eq('status', 'pending');

      if (error) throw error;

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
    setRequests((prev) => prev.filter((item) => item.id !== requestId));
  }, []);

  return { requests, loading, accepting, acceptRequest, rejectRequest, fetchRequests };
}
