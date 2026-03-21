import { useEffect, useRef, useState } from 'react';

interface LatLng {
  lat: number;
  lng: number;
}

const ANIMATION_DURATION = 2000; // ms — smooth transition over 2s
const FRAME_INTERVAL = 16; // ~60fps

/**
 * Smoothly interpolates between position updates for fluid map animation.
 */
export function useSmoothedPosition(target: LatLng | null | undefined): LatLng | null {
  const [current, setCurrent] = useState<LatLng | null>(target ?? null);
  const animRef = useRef<number | null>(null);
  const startRef = useRef<LatLng | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!target) {
      setCurrent(null);
      return;
    }

    // First position — snap immediately
    if (!current) {
      setCurrent(target);
      return;
    }

    // Start animation from current rendered position
    startRef.current = { ...current };
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / ANIMATION_DURATION, 1);
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);

      const from = startRef.current!;
      setCurrent({
        lat: from.lat + (target.lat - from.lat) * ease,
        lng: from.lng + (target.lng - from.lng) * ease,
      });

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.lat, target?.lng]);

  return current;
}
