import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TranslateResult {
  text: string;
  detectedSource?: string;
}

export function useGoogleTranslate() {
  const [loading, setLoading] = useState(false);

  const translate = async (
    texts: string[],
    target: string,
    source?: string
  ): Promise<TranslateResult[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-translate", {
        body: { texts, target, source },
      });
      if (error) throw error;
      return data.translations as TranslateResult[];
    } finally {
      setLoading(false);
    }
  };

  const translateOne = async (
    text: string,
    target: string,
    source?: string
  ): Promise<string> => {
    const results = await translate([text], target, source);
    return results[0]?.text ?? text;
  };

  return { translate, translateOne, loading };
}
