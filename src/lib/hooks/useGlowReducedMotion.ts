"use client";

import { useReducedMotion as useFramerReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * True when the user prefers reduced motion (system or stored preference).
 */
export function useGlowReducedMotion(): boolean {
  const systemReduced = useFramerReducedMotion() ?? false;
  const [prefReduced, setPrefReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPreference() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data } = await supabase
        .from("preferences")
        .select("reduce_motion")
        .eq("parent_id", user.id)
        .maybeSingle();

      if (!cancelled && data?.reduce_motion) {
        setPrefReduced(true);
      }
    }

    void loadPreference();
    return () => {
      cancelled = true;
    };
  }, []);

  return systemReduced || prefReduced;
}
