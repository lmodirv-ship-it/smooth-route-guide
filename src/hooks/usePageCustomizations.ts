import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PageCustomization {
  id: string;
  page_slug: string;
  section_id: string;
  properties: Record<string, any>;
  sort_order: number;
  is_visible: boolean;
  updated_at: string;
}

export const usePageCustomizations = (pageSlug?: string) => {
  const [customizations, setCustomizations] = useState<PageCustomization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pageSlug) { setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from("page_customizations")
        .select("*")
        .eq("page_slug", pageSlug)
        .order("sort_order");
      setCustomizations((data as PageCustomization[]) || []);
      setLoading(false);
    };
    fetch();

    const channelName = `page-cust-${pageSlug}-${Math.random().toString(36).slice(2)}`;
    const ch = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "page_customizations", filter: `page_slug=eq.${pageSlug}` }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [pageSlug]);

  const getSectionProps = (sectionId: string) => {
    const c = customizations.find(x => x.section_id === sectionId);
    return {
      properties: c?.properties || {},
      isVisible: c?.is_visible ?? true,
      sortOrder: c?.sort_order ?? 0,
    };
  };

  return { customizations, loading, getSectionProps };
};
