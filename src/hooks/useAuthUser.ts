import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAuthUserId() {
  const [state, setState] = useState<{ ready: boolean; userId: string | null }>({
    ready: false,
    userId: null,
  });

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setState({ ready: true, userId: data.session?.user.id ?? null });
    }).catch(() => {
      if (!cancelled) setState({ ready: true, userId: null });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ ready: true, userId: session?.user.id ?? null });
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
