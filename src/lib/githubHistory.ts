import { parseGithubRepo } from "./github";

/** Matches `tree/main/...` and raw URLs in this app. Extend if manifests carry a branch field. */
export const DEFAULT_REPOSITORY_BRANCH = "main";

/** Web UI: commits filtered to touches under `pathInRepo` (folder or file). */
export function githubCommitsWebUrl(
  repoUrl: string,
  pathInRepo: string,
  branch: string = DEFAULT_REPOSITORY_BRANCH
): string | null {
  const parsed = parseGithubRepo(repoUrl);
  if (!parsed || !pathInRepo.trim()) return null;

  const segs = pathInRepo.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (!segs.length) return null;
  const pathPart = segs.map(encodeURIComponent).join("/");

  return `https://github.com/${parsed.owner}/${parsed.repo}/commits/${encodeURIComponent(branch)}/${pathPart}`;
}

export type GithubCommitRow = {
  sha: string;
  shortSha: string;
  messageFirstLine: string;
  authoredAt: string | null;
  htmlUrl: string;
};

/** Commits reachable from `branch` that modify `path` (Git treats this as subdirectory filter). */
export async function fetchRecentCommitsForPath(
  owner: string,
  repo: string,
  pathInRepo: string,
  branch: string,
  count: number,
  signal?: AbortSignal
): Promise<GithubCommitRow[]> {
  const path = pathInRepo.replace(/^\/+|\/+$/g, "");
  const u = new URL(`https://api.github.com/repos/${owner}/${repo}/commits`);
  u.searchParams.set("sha", branch);
  u.searchParams.set("path", path);
  u.searchParams.set("per_page", String(count));

  const res = await fetch(u.toString(), {
    signal,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  // No CORS token: public repo usually works; failures fall back to web-only link upstream.
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}${text ? `: ${text.slice(0, 140)}` : ""}`);
  }

  const rowsPayload = (await res.json()) as unknown;
  if (!Array.isArray(rowsPayload)) {
    throw new Error("Unexpected response from GitHub");
  }

  const rows = rowsPayload as Array<{
    sha: string;
    html_url: string;
    commit: { message?: string; author?: { date?: string } | null };
  }>;

  return rows.map((r) => {
    const raw = r.commit.message ?? "";
    const first = raw.split(/\r?\n/)[0] ?? "";
    return {
      sha: r.sha,
      shortSha: r.sha.slice(0, 7),
      messageFirstLine: first.length > 160 ? `${first.slice(0, 157)}…` : first,
      authoredAt: r.commit.author?.date ?? null,
      htmlUrl: r.html_url,
    };
  });
}
