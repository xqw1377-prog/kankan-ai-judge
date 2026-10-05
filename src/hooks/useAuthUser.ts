import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AUTH_WAIT_MS = 3000;

export function useAuthUserId() {
  const [state, setState] = useState<{ ready: boolean; userId: string | null }>({
    ready: false,
    userId: null,
  });

  useEffect(() => {
    let cancelled = false;
    const finish = (userId: string | null) => {
      if (!cancelled) setState({ ready: true, userId });
    };
    const timer = window.setTimeout(() => {
      setState((current) => (current.ready ? current : { ready: true, userId: null }));
    }, AUTH_WAIT_MS);

    supabase.auth.getSession().then(({ data }) => {
      finish(data.session?.user.id ?? null);
    }).catch(() => finish(null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      finish(session?.user.id ?? null);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
