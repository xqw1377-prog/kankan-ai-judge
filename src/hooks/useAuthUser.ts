import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AUTH_WAIT_MS = 3000;

function identityOf(user: { id: string; is_anonymous?: boolean } | null | undefined) {
  if (!user) return { userId: null as string | null, isAnonymous: false };
  return { userId: user.id, isAnonymous: user.is_anonymous === true };
}

export function useAuthUserId() {
  const [state, setState] = useState<{ ready: boolean; userId: string | null; isAnonymous: boolean }>({
    ready: false,
    userId: null,
    isAnonymous: false,
  });

  useEffect(() => {
    let cancelled = false;
    const finish = (user: { id: string; is_anonymous?: boolean } | null | undefined) => {
      if (!cancelled) setState({ ready: true, ...identityOf(user) });
    };
    const timer = window.setTimeout(() => {
      setState((current) => (current.ready ? current : { ready: true, userId: null, isAnonymous: false }));
    }, AUTH_WAIT_MS);

    supabase.auth.getSession().then(({ data }) => {
      finish(data.session?.user);
    }).catch(() => finish(null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      finish(session?.user);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
