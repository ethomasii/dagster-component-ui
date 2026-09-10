import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { lucideNameToKebab } from "../lib/lucideKebab";

const LUCIDE_STATIC_VER = "0.460.0";

type Props = {
  icon?: string;
  size?: number;
  title?: string;
  className?: string;
};

/**
 * Renders manifest `icon`. Three schemes:
 *   - `si:<slug>`         → Simple Icons brand mark (e.g. `si:snowflake`)
 *   - `favicon:<domain>`  → vendor's site favicon via Google's favicon
 *                            service (e.g. `favicon:collibra.com`) — fallback
 *                            for vendors without a Simple Icons entry.
 *   - anything else       → Lucide icon by name (e.g. `BarChart2`)
 */
export function ComponentIcon({ icon, size = 24, title, className }: Props) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [icon]);

  if (!icon?.trim() || broken) {
    return (
      <span
        className={className}
        style={{ display: "inline-flex", color: "var(--icon-fallback)" }}
        title={title}
        aria-hidden={title ? undefined : true}
      >
        <Package size={size} strokeWidth={1.75} aria-hidden />
      </span>
    );
  }

  if (icon.startsWith("si:")) {
    const slug = icon.slice(3).toLowerCase();
    // jsdelivr's simple-icons mirror has 100% coverage of the npm
    // package. cdn.simpleicons.org has a partial index that 404s on
    // many valid slugs (aws, openai, microsoftazure, ...) — using the
    // full npm mirror instead so every `si:*` slug renders.
    return (
      <img
        className={`component-icon component-icon--brand ${className ?? ""}`}
        src={`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg`}
        width={size}
        height={size}
        alt=""
        title={title ?? slug}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
    );
  }

  if (icon.startsWith("favicon:")) {
    // Google's favicon service: follows redirects to the vendor's
    // best-available favicon and serves at the requested size.
    // sz=64 is high enough for the 20-40px component-card renders.
    const domain = icon.slice("favicon:".length).trim();
    return (
      <img
        className={`component-icon component-icon--favicon ${className ?? ""}`}
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
        width={size}
        height={size}
        alt=""
        title={title ?? domain}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
    );
  }

  const kebab = lucideNameToKebab(icon);
  const src = `https://cdn.jsdelivr.net/npm/lucide-static@${LUCIDE_STATIC_VER}/icons/${kebab}.svg`;

  return (
    <img
      className={`component-icon component-icon--lucide ${className ?? ""}`}
      src={src}
      width={size}
      height={size}
      alt=""
      title={title ?? icon}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
    />
  );
}
