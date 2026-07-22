import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * شريط تقدم بسيط أعلى الصفحة يظهر أثناء التنقل بين المسارات.
 * لا يعتمد على مكتبات خارجية.
 */
export default function RouteProgress() {
  const location = useLocation();
  const navType = useNavigationType();
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    bar.style.transition = "none";
    bar.style.width = "0%";
    bar.style.opacity = "1";
    // trigger animation
    requestAnimationFrame(() => {
      bar.style.transition = "width 400ms ease-out, opacity 300ms ease-out 400ms";
      bar.style.width = "90%";
    });
    const t = window.setTimeout(() => {
      bar.style.width = "100%";
      bar.style.opacity = "0";
    }, 450);
    return () => window.clearTimeout(t);
  }, [location.pathname, navType]);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        ref={barRef}
        style={{
          height: "100%",
          width: "0%",
          background: "hsl(var(--primary))",
          boxShadow: "0 0 8px hsl(var(--primary))",
        }}
      />
    </div>
  );
}
