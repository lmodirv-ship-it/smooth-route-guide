import { useMemo } from "react";
import type { ManaraImport, ManaraExport } from "@/hooks/useManaraNetwork";

interface Props {
  sites: string[];
  selfSite: string;
  imports: ManaraImport[];
  exports: ManaraExport[];
}

/**
 * Glowing orbital network around the Manara sphere.
 * Each HN group site is a luminous node orbiting the sphere;
 * recent signals render as light pulses traveling between node and core.
 */
const ManaraNetworkOrbit = ({ sites, selfSite, imports, exports }: Props) => {
  const nodes = useMemo(() => {
    const list = sites.filter(Boolean).slice(0, 10);
    return list.map((site, i) => {
      const angle = (360 / Math.max(list.length, 1)) * i;
      const lastIn = imports.find((s) => s.sender_site === site);
      const lastOut = exports.find((s) => s.source_site === site);
      const lastSeen = [lastIn?.created_at, lastOut?.created_at].filter(Boolean).sort().pop();
      const ageMin = lastSeen ? (Date.now() - new Date(lastSeen).getTime()) / 60000 : Infinity;
      const state = site === selfSite ? "self" : ageMin < 10 ? "online" : ageMin < 120 ? "stale" : "idle";
      return { site, angle, state };
    });
  }, [sites, selfSite, imports, exports]);

  const pulses = useMemo(() => {
    const recent = [
      ...imports.slice(0, 4).map((s) => ({ key: `in-${s.id}`, dir: "in" as const, from: s.sender_site })),
      ...exports.slice(0, 4).map((s) => ({ key: `out-${s.id}`, dir: "out" as const, from: s.source_site })),
    ];
    return recent.map((p) => {
      const node = nodes.find((n) => n.site === p.from);
      return { ...p, angle: node?.angle ?? 0 };
    });
  }, [imports, exports, nodes]);

  const colorFor = (state: string) =>
    state === "self"
      ? "hsl(var(--primary))"
      : state === "online"
        ? "hsl(142 71% 55%)"
        : state === "stale"
          ? "hsl(45 93% 58%)"
          : "hsl(var(--muted-foreground))";

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      <div className="manara-orbit-stage absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {nodes.map((n) => (
          <div
            key={n.site}
            className="manara-orbit-node"
            style={{ transform: `rotate(${n.angle}deg) translateX(var(--orbit-radius)) rotate(-${n.angle}deg)` }}
          >
            <span
              className="manara-orbit-dot"
              style={{
                background: colorFor(n.state),
                boxShadow: `0 0 12px 3px ${colorFor(n.state)}`,
              }}
            />
            <span className="manara-orbit-label">{n.site}</span>
          </div>
        ))}
        {pulses.map((p) => (
          <span
            key={p.key}
            className={`manara-signal-pulse ${p.dir === "in" ? "manara-pulse-in" : "manara-pulse-out"}`}
            style={{ transform: `rotate(${p.angle}deg)` }}
          />
        ))}
      </div>

      <style>{`
        .manara-orbit-stage { --orbit-radius: min(38vmin, 340px); width: 0; height: 0; animation: manara-orbit-spin 60s linear infinite; }
        .manara-orbit-node { position: absolute; left: 0; top: 0; display: flex; align-items: center; gap: 6px; }
        .manara-orbit-dot { width: 12px; height: 12px; border-radius: 9999px; animation: manara-node-breathe 3s ease-in-out infinite; }
        .manara-orbit-label { font-size: 10px; letter-spacing: .05em; color: hsl(var(--muted-foreground) / .8); }
        .manara-signal-pulse { position: absolute; left: 0; top: 0; width: var(--orbit-radius); height: 2px; transform-origin: 0 50%; background: linear-gradient(90deg, transparent, hsl(var(--primary) / .9), transparent); filter: drop-shadow(0 0 6px hsl(var(--primary))); opacity: 0; }
        .manara-pulse-in { animation: manara-pulse 3.2s ease-in-out infinite; }
        .manara-pulse-out { animation: manara-pulse 3.2s ease-in-out 1.6s infinite reverse; }
        @keyframes manara-orbit-spin { to { transform: translate(-50%,-50%) rotate(360deg); } }
        @keyframes manara-node-breathe { 0%,100% { transform: scale(1); opacity: .85; } 50% { transform: scale(1.35); opacity: 1; } }
        @keyframes manara-pulse { 0%,100% { opacity: 0; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .manara-orbit-stage, .manara-orbit-dot, .manara-signal-pulse { animation: none; }
          .manara-signal-pulse { opacity: .25; }
        }
      `}</style>
    </div>
  );
};

export default ManaraNetworkOrbit;
