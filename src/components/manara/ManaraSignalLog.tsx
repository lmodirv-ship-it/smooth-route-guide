import { useState } from "react";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useManaraNetwork } from "@/hooks/useManaraNetwork";

/** Collapsible live strip of the latest Manara signals (imports + exports). */
const ManaraSignalLog = () => {
  const [open, setOpen] = useState(false);
  const { imports, exports: exports_, siteId } = useManaraNetwork();

  const rows = [
    ...imports.map((i) => ({
      id: `in-${i.id}`,
      dir: "⇣",
      site: i.sender_site,
      text: `${i.signal_type}: ${i.signal_key}${i.signal_value ? ` → ${i.signal_value}` : ""}`,
      time: i.created_at,
    })),
    ...exports_.map((e) => ({
      id: `out-${e.id}`,
      dir: "⇡",
      site: e.source_site,
      text: `${e.signal_type}: ${e.signal_key}${e.new_value ? ` → ${e.new_value}` : ""}`,
      time: e.created_at,
    })),
  ]
    .sort((a, b) => +new Date(b.time) - +new Date(a.time))
    .slice(0, 8);

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 px-3 pb-3" dir="rtl">
      <div className="mx-auto max-w-xl rounded-2xl border border-border/50 bg-background/60 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-2 text-xs text-muted-foreground"
        >
          <span className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-primary" />
            شبكة منارة · {siteId} · {rows.length} إشارة
          </span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
        {open && (
          <ul className="max-h-48 space-y-1 overflow-y-auto px-4 pb-3 text-xs">
            {rows.length === 0 && <li className="py-2 text-muted-foreground">لا إشارات بعد — الشبكة بانتظار أول شيفرة.</li>}
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1">
                <span className="truncate">
                  <span className="me-1 text-primary">{r.dir}</span>
                  <span className="font-medium">{r.site}</span> · {r.text}
                </span>
                <time className="shrink-0 text-muted-foreground">
                  {new Date(r.time).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ManaraSignalLog;
