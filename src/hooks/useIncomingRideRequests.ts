import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/firestoreClient';
import { toast } from '@/hooks/use-toast';

export interface RideRequest {
  id: string;
  user_id: string;
  pickup: string;
  destination: string;
  price: number | null;
  status: string;
  created_at: string;
  passenger_name?: string;
}

export function useIncomingRideRequests(isOnline: boolean) {
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  // Fetch pending requests
  const fetchRequests = useCallback(async () => {
    if (!isOnline) {
      setRequests([]);
      return;
    }

    const { data, error } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      // Fetch passenger names
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

      setRequests(data.map(r => ({
        ...r,
        passenger_name: profileMap.get(r.user_id) || 'راكب',
      })));
    }
  }, [isOnline]);

  // Subscribe to realtime changes
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
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests',
          filter: 'status=eq.pending',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOnline, fetchRequests]);

  // Accept a ride request
  const acceptRequest = useCallback(async (request: RideRequest) => {
    setAccepting(request.id);
    try {
      // Get driver record
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('غير مسجل الدخول');

      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driver) throw new Error('لم يتم العثور على بيانات السائق');

      // Update ride request status
      const { error: updateError } = await supabase
        .from('ride_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Create trip
      const { error: tripError } = await supabase
        .from('trips')
        .insert({
          user_id: request.user_id,
          driver_id: driver.id,
          start_location: request.pickup,
          end_location: request.destination,
          fare: request.price || 0,
          status: 'in_progress',
        });

      if (tripError) throw tripError;

      toast({
        title: 'تم قبول الرحلة ✅',
        description: `من ${request.pickup} إلى ${request.destination}`,
      });

      // Remove from local state
      setRequests(prev => prev.filter(r => r.id !== request.id));
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

  // Reject a ride request
  const rejectRequest = useCallback(async (requestId: string) => {
    const { error } = await supabase
      .from('ride_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (!error) {
      setRequests(prev => prev.filter(r => r.id !== requestId));
    }
  }, []);

  return { requests, loading, accepting, acceptRequest, rejectRequest, fetchRequests };
}
