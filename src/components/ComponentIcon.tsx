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
 * Renders manifest `icon`: Lucide name (e.g. BarChart2) or Simple Icons `si:slug`.
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
    return (
      <img
        className={`component-icon component-icon--brand ${className ?? ""}`}
        src={`https://cdn.simpleicons.org/${slug}`}
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
