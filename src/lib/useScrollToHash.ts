import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to the element named by the URL hash once `ready` is true. Markdown headings are
 * rendered after an async fetch, so the browser's native hash scroll has already missed them.
 */
export function useScrollToHash(ready: boolean) {
  const { hash } = useLocation();
  useEffect(() => {
    if (!ready || !hash) return;
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      /* keep raw id */
    }
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [ready, hash]);
}
