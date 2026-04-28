import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SearchPalette } from "../components/SearchPalette";
import { loadManifest } from "../data/loadManifest";
import type { ManifestComponent } from "../types";
import { OPEN_SEARCH_PALETTE_EVENT } from "../lib/openSearchPalette";

type CatalogValue = {
  components: ManifestComponent[];
  manifestMeta: { last_updated: string; repo: string } | null;
  /** When this tab last successfully loaded manifest.json (browser time). */
  manifestFetchedAt: string | null;
  loadError: string | null;
  openSearchPalette: () => void;
  /** Re-fetch manifest from GitHub raw (shows latest published manifest.json). */
  reloadCatalog: () => Promise<void>;
};

const CatalogCtx = createContext<CatalogValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [components, setComponents] = useState<ManifestComponent[]>([]);
  const [manifestMeta, setManifestMeta] = useState<{
    last_updated: string;
    repo: string;
  } | null>(null);
  const [manifestFetchedAt, setManifestFetchedAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reloadCatalog = useCallback(async () => {
    try {
      setLoadError(null);
      const m = await loadManifest();
      setComponents(m.components);
      setManifestMeta({ last_updated: m.last_updated, repo: m.repository });
      setManifestFetchedAt(new Date().toISOString());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load data");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await loadManifest();
        if (cancelled) return;
        setComponents(m.components);
        setManifestMeta({ last_updated: m.last_updated, repo: m.repository });
        setManifestFetchedAt(new Date().toISOString());
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load data");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onOpen = () => setPaletteOpen(true);
    window.addEventListener(OPEN_SEARCH_PALETTE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SEARCH_PALETTE_EVENT, onOpen);
  }, []);

  const openSearchPalette = useCallback(() => setPaletteOpen(true), []);

  const value = useMemo(
    () => ({
      components,
      manifestMeta,
      manifestFetchedAt,
      loadError,
      openSearchPalette,
      reloadCatalog,
    }),
    [components, manifestMeta, manifestFetchedAt, loadError, openSearchPalette, reloadCatalog]
  );

  return (
    <CatalogCtx.Provider value={value}>
      {children}
      <SearchPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        components={components}
      />
    </CatalogCtx.Provider>
  );
}

export function useCatalog(): CatalogValue {
  const ctx = useContext(CatalogCtx);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
