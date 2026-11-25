/** Lets the floating DCC Agent widget and the standalone `/dcc-agent` page
 *  hand a snapshot of the conversation-so-far to each other across a real
 *  browser-window boundary (localStorage, not a JS reference) — "pop out"
 *  seeds the new window from the widget's current thread, and either side
 *  picks up the other's latest snapshot the next time it mounts with
 *  nothing of its own yet. Not a live two-way sync; each side goes on to
 *  manage its own state independently after that point. */
const KEY = "dcc-agent-thread-v1";

export function loadStoredThread<T = unknown>(): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function saveStoredThread(thread: unknown[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(thread));
  } catch {
    // Private browsing / quota exceeded / storage disabled — this is only
    // a convenience carry-over, never required state, so just drop it.
  }
}
