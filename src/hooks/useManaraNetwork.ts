import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ManaraImport {
  id: string;
  export_id: string | null;
  sender_site: string;
  recipient_site: string | null;
  signal_type: string;
  signal_key: string;
  signal_value: string | null;
  payload: Record<string, unknown>;
  process_status: "received" | "applied" | "ignored" | "rejected";
  reject_reason: string | null;
  created_at: string;
}

export interface ManaraExport {
  id: string;
  source_site: string;
  signal_type: string;
  signal_key: string;
  old_value: string | null;
  new_value: string | null;
  target_sites: string[];
  status: string;
  created_at: string;
}

const SITE_KEY = "hn_manara_site_id";
const DOMAIN_MAP_KEY = "hn_manara_domain_map";

export const getManaraSiteId = (): string => {
  const host = window.location.hostname;
  if (host.includes("admin")) return "admin";
  if (host.includes("driver") && !host.startsWith("www") && !host.startsWith("hn-driver")) return "driver";
  if (host.includes("client")) return "client";
  if (host.includes("delivery")) return "delivery";
  if (host.includes("call")) return "call";
  if (host.includes("stock")) return "stock";
  return "main";
};

/** Latest applied domain/route knowledge shared across the HN group. */
export const getManaraDomainMap = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(DOMAIN_MAP_KEY) ?? "{}");
  } catch {
    return {};
  }
};

const mergeDomainMap = (entries: Record<string, string>) => {
  try {
    const current = getManaraDomainMap();
    localStorage.setItem(DOMAIN_MAP_KEY, JSON.stringify({ ...current, ...entries }));
  } catch {
    /* ignore */
  }
};

export const useManaraNetwork = () => {
  const siteId = useMemo(getManaraSiteId, []);
  const [imports, setImports] = useState<ManaraImport[]>([]);
  const [exports_, setExports] = useState<ManaraExport[]>([]);
  const [loading, setLoading] = useState(true);
  const ackedRef = useRef<Set<string>>(new Set());

  const applySignals = useCallback((rows: ManaraImport[]) => {
    const domainEntries: Record<string, string> = {};
    const toAck: string[] = [];
    for (const row of rows) {
      if (row.process_status !== "received" || ackedRef.current.has(row.id)) continue;
      if (row.signal_type === "domain_change" && row.signal_value) {
        domainEntries[row.signal_key] = row.signal_value;
        toAck.push(row.id);
      } else {
        toAck.push(row.id);
      }
      ackedRef.current.add(row.id);
    }
    if (Object.keys(domainEntries).length > 0) mergeDomainMap(domainEntries);
    if (toAck.length > 0) {
      supabase
        .from("manara_imports")
        .update({ process_status: "applied" })
        .in("id", toAck)
        .eq("process_status", "received")
        .then(() => undefined);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [imp, exp] = await Promise.all([
        supabase
          .from("manara_imports")
          .select("*")
          .or(`recipient_site.eq.${siteId},recipient_site.is.null`)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("manara_exports").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      if (cancelled) return;
      if (imp.data) {
        setImports(imp.data as ManaraImport[]);
        applySignals(imp.data as ManaraImport[]);
      }
      if (exp.data) setExports(exp.data as ManaraExport[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`manara-network-${siteId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "manara_imports" },
        (payload) => {
          const row = payload.new as ManaraImport;
          if (row.recipient_site && row.recipient_site !== siteId) return;
          setImports((prev) => [row, ...prev].slice(0, 50));
          applySignals([row]);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "manara_exports" },
        (payload) => {
          setExports((prev) => [payload.new as ManaraExport, ...prev].slice(0, 50));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [siteId, applySignals]);

  // Known group sites derived from recent traffic
  const sites = useMemo(() => {
    const set = new Set<string>([siteId]);
    imports.forEach((i) => set.add(i.sender_site));
    exports_.forEach((e) => {
      set.add(e.source_site);
      e.target_sites.forEach((t) => set.add(t));
    });
    return [...set];
  }, [imports, exports_, siteId]);

  return { siteId, imports, exports: exports_, sites, loading };
};
