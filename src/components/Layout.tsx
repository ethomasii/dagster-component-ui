import type { CSSProperties, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search } from "lucide-react";

// GitHub's Octocat mark — inline SVG since lucide-react dropped brand icons for licensing.
function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.04 1.78 2.73 1.26 3.4.96.1-.75.4-1.27.73-1.56-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18.92-.26 1.9-.39 2.88-.39s1.96.13 2.88.39c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56C20.22 21.4 23.5 17.09 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}
import { useCatalog } from "../context/CatalogContext";
import { ThemeToggle } from "./ThemeToggle";

type ExternalNavItem = { href: string; label: string };

const externalNav: ExternalNavItem[] = [
  { href: "https://docs.dagster.io", label: "Docs" },
  {
    href: "https://github.com/eric-thomas-dagster/dagster-component-templates",
    label: "GitHub",
  },
];

function navPillStyle(active: boolean): CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    color: active ? "var(--text)" : "var(--text-muted)",
    background: active ? "rgba(124, 58, 237, 0.15)" : "transparent",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };
}

export function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation();
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
            aria-label="Eric's Dagster Component Registry home"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              textDecoration: "none",
              color: "var(--text)",
              minWidth: 0,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                flexWrap: "nowrap",
                alignItems: "center",
                gap: 0,
                whiteSpace: "nowrap",
                lineHeight: 1.2,
                minWidth: 0,
              }}
            >
              <span className="brand-name-eric brand-name-eric--masthead">Eric&rsquo;s</span>
              <span
                style={{
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  fontSize: "clamp(12px, 2.1vw, 15px)",
                  marginLeft: "0.18em",
                }}
              >
                Dagster Component Registry
              </span>
            </span>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            </div>
            <Link
              to="/examples"
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                color: loc.pathname.startsWith("/examples") ? "var(--text)" : "var(--text-muted)",
                background: loc.pathname.startsWith("/examples")
                  ? "rgba(124, 58, 237, 0.15)"
                  : "transparent",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Examples
            </Link>
            <Link
              to="/vendors"
              style={navPillStyle(loc.pathname.startsWith("/vendors"))}
              title="Vendor landing pages — components and walkthroughs per platform"
            >
              Vendors
            </Link>
            <Link
              to="/get-started"
              style={navPillStyle(loc.pathname === "/get-started")}
              title="Install the CLI and add templates (uvx or pip)"
            >
              Get started
            </Link>
            <Link
              to="/ai-assistants"
              style={navPillStyle(loc.pathname === "/ai-assistants")}
              title="Claude, Cursor, GitHub Copilot — dagster-component init and workflows"
            >
              AI assistants
            </Link>
            <Link
              to="/dagster-plus"
              style={navPillStyle(loc.pathname === "/dagster-plus")}
              title="Deploy catalog components to Dagster+ (guide from the CLI repo)"
            >
              Dagster+
            </Link>
            {externalNav.map((item) => {
              const isGithub = item.label === "GitHub";
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  title={item.label}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: isGithub ? "8px 10px" : "8px 14px",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text-muted)",
                    textDecoration: "none",
                  }}
                >
                  {isGithub ? <GithubIcon size={18} /> : item.label}
                </a>
              );
            })}
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
