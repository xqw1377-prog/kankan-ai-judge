import { useEffect, useRef } from "react";

interface TurnstileApi {
  render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => string;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Explicit Cloudflare Turnstile. The site key is VITE_TURNSTILE_SITE_KEY. */
const TurnstileWidget = ({ siteKey, onToken, onError }: {
  siteKey: string;
  onToken: (token: string) => void;
  onError: () => void;
}) => {
  const host = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  onTokenRef.current = onToken;
  onErrorRef.current = onError;

  useEffect(() => {
    const el = host.current;
    if (!el || !siteKey) return;
    let widgetId = "";
    let cancelled = false;
    const render = () => {
      if (cancelled || !window.turnstile || !host.current) return;
      widgetId = window.turnstile.render(host.current, {
        sitekey: siteKey,
        callback: (token) => onTokenRef.current(token),
      });
    };
    if (window.turnstile) {
      render();
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = render;
      script.onerror = () => onErrorRef.current();
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  return <div ref={host} data-testid="turnstile" className="min-h-16" />;
};

export default TurnstileWidget;
