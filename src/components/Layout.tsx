import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { useCatalog } from "../context/CatalogContext";
import { ThemeToggle } from "./ThemeToggle";

type NavItem =
  | { to: string; label: string }
  | { href: string; label: string; external: true };

const DAGSTER_LOGO_URL =
  "https://cdn.prod.website-files.com/681399f654933b29e12fb8bd/681399f654933b29e12fb8e1_Dagster%20Logo.avif";

const nav: NavItem[] = [
  { to: "/", label: "Registry" },
  { href: "https://docs.dagster.io", label: "Docs", external: true },
  {
    href: "https://github.com/eric-thomas-dagster/dagster-component-templates",
    label: "GitHub",
    external: true,
  },
];

export function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const onHome = loc.pathname === "/";
  const { openSearchPalette } = useCatalog();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid var(--border)",
          background: "var(--header-bg)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <Link
            to="/"
            aria-label="Component Registry home"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "var(--text)",
            }}
          >
            <img
              src={DAGSTER_LOGO_URL}
              alt=""
              decoding="async"
              style={{
                height: 32,
                width: "auto",
                maxWidth: 152,
                objectFit: "contain",
                objectPosition: "left center",
                display: "block",
              }}
            />
            <span style={{ fontWeight: 600, letterSpacing: "-0.02em" }}>Component Registry</span>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => openSearchPalette()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-muted)",
                fontSize: 14,
                fontWeight: 500,
              }}
              title="Search catalog (⌘K)"
            >
              <Search size={16} strokeWidth={2} aria-hidden />
              <span>Search</span>
              <span className="kbd" style={{ marginLeft: 2 }}>
                ⌘K
              </span>
            </button>
            <ThemeToggle />
            {nav.map((item) =>
              "to" in item ? (
                <Link
                  key={item.to}
                  to={item.to}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: onHome && item.to === "/" ? "var(--text)" : "var(--text-muted)",
                    background:
                      onHome && item.to === "/" ? "rgba(124, 58, 237, 0.15)" : "transparent",
                    textDecoration: "none",
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text-muted)",
                    textDecoration: "none",
                  }}
                >
                  {item.label}
                </a>
              )
            )}
          </nav>
        </div>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "32px 24px",
          marginTop: "auto",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "space-between",
            alignItems: "center",
            color: "var(--text-dim)",
            fontSize: 13,
          }}
        >
          <span>
            Data from{" "}
            <a href="https://github.com/eric-thomas-dagster/dagster-component-templates">
              dagster-component-templates
            </a>
            .
          </span>
          <span>Open source · MIT</span>
        </div>
      </footer>
    </div>
  );
}
