import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

const CHUNK_RELOAD_KEY = "kankan_chunk_reload";

function isChunkError(error: Error) {
  return /dynamically imported module|Loading chunk|Failed to fetch|Importing a module script failed/i.test(error.message);
}

/** Failed lazy routes (including Profile.tsx) render this instead of an empty page. */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (isChunkError(error) && sessionStorage.getItem(CHUNK_RELOAD_KEY) !== "1") {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
      window.location.reload();
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-base font-semibold text-card-foreground">页面没有加载出来</p>
        <p className="text-sm text-muted-foreground">请重新加载。如果刚更新过应用，这通常是旧页面缓存。</p>
        <button
          type="button"
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          onClick={() => {
            sessionStorage.removeItem(CHUNK_RELOAD_KEY);
            window.location.reload();
          }}
        >
          重新加载
        </button>
      </div>
    );
  }
}
