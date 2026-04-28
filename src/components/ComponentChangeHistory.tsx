import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { parseGithubRepo } from "../lib/github";
import {
  DEFAULT_REPOSITORY_BRANCH,
  fetchRecentCommitsForPath,
  githubCommitsWebUrl,
  type GithubCommitRow,
} from "../lib/githubHistory";
import { formatIsoDate } from "../lib/format";

type Props = {
  repoUrl: string;
  /** Repo-relative folder for the template. GitHub commits API filters touches under this path. */
  folderPath: string;
};

/** Recent commits touching the template folder, plus link to GitHub’s full filtered history. */
export function ComponentChangeHistory({ repoUrl, folderPath }: Props) {
  const trimmed = folderPath.replace(/^\/+|\/+$/g, "");
  const gh = parseGithubRepo(repoUrl);
  const commitsUrl =
    gh && trimmed ? githubCommitsWebUrl(repoUrl, trimmed, DEFAULT_REPOSITORY_BRANCH) : null;

  const [rows, setRows] = useState<GithubCommitRow[] | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "error" | "empty">("loading");

  useEffect(() => {
    if (!gh || !trimmed || !commitsUrl) {
      setPhase("idle");
      return;
    }
    const ac = new AbortController();
    setPhase("loading");
    setRows(null);
    (async () => {
      try {
        const list = await fetchRecentCommitsForPath(
          gh.owner,
          gh.repo,
          trimmed,
          DEFAULT_REPOSITORY_BRANCH,
          10,
          ac.signal
        );
        if (!ac.signal.aborted) {
          if (list.length === 0) setPhase("empty");
          else {
            setRows(list);
            setPhase("idle");
          }
        }
      } catch {
        if (!ac.signal.aborted) {
          setPhase("error");
          setRows(null);
        }
      }
    })();
    return () => ac.abort();
  }, [gh?.owner, gh?.repo, trimmed, commitsUrl]);

  if (!gh || !commitsUrl || !trimmed) return null;

  const dateLabel = (iso: string | null) => (!iso ? "—" : formatIsoDate(iso));

  return (
    <section style={{ marginBottom: 26 }}>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 650,
          letterSpacing: "-0.02em",
          color: "var(--text)",
          margin: "0 0 8px",
        }}
      >
        Change history
      </h2>
      <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.55 }}>
        Commits touching{" "}
        <code className="mono" style={{ fontSize: 13, color: "var(--cyan)" }}>
          {trimmed}
        </code>{" "}
        in the catalog repo (includes <span className="mono">component.py</span>, schemas, YAML examples, README, and
        the rest of the folder).{" "}
        <a
          href={commitsUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            color: "var(--cyan)",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ExternalLink size={14} aria-hidden /> View full history on GitHub
        </a>
      </p>

      {phase === "loading" && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>Loading recent commits…</p>
      )}

      {phase === "error" && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5 }}>
          Preview unavailable (network or GitHub limits).{" "}
          <a href={commitsUrl} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
            Open commits on GitHub
          </a>
          .
        </p>
      )}

      {phase === "empty" && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>
          No commits matched under this path—try GitHub&apos;s filtered view linked above.
        </p>
      )}

      {rows && rows.length > 0 && (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 0,
            borderRadius: 10,
            border: "1px solid var(--border)",
            overflow: "hidden",
            background: "var(--bg-card)",
          }}
        >
          {rows.map((c, i) => (
            <li
              key={c.sha}
              style={{
                padding: "10px 14px",
                borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : undefined,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "baseline",
                  gap: "6px 12px",
                  marginBottom: 4,
                }}
              >
                <time
                  dateTime={c.authoredAt ?? undefined}
                  style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  {dateLabel(c.authoredAt)}
                </time>
                <a
                  href={c.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mono"
                  style={{ fontSize: 12, color: "var(--cyan)", flexShrink: 0 }}
                  title={c.sha}
                >
                  {c.shortSha}
                </a>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "var(--text-muted)",
                  lineHeight: 1.45,
                  wordBreak: "break-word",
                }}
              >
                {c.messageFirstLine || "(no subject)"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
