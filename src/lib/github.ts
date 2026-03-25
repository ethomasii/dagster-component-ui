/** Parse `https://github.com/owner/repo` or `…/repo.git` */
export function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

/** Prefilled GitHub issue URL (works when the repo has Issues enabled). */
export function githubNewIssueUrl(
  repo: string,
  opts: { title: string; body?: string; labels?: string[] }
): string | null {
  const p = parseGithubRepo(repo);
  if (!p) return null;
  const u = new URL(`https://github.com/${p.owner}/${p.repo}/issues/new`);
  u.searchParams.set("title", opts.title);
  if (opts.body) u.searchParams.set("body", opts.body);
  if (opts.labels?.length) u.searchParams.set("labels", opts.labels.join(","));
  return u.toString();
}

/**
 * One-line copy of a subfolder from GitHub using tiged (maintained fork of degit).
 * @see https://github.com/tiged/tiged
 */
export function buildTigedCommand(
  owner: string,
  repo: string,
  pathInRepo: string,
  destFolderName: string,
  destParent = "defs/components"
): string {
  const sub = pathInRepo.replace(/^\/+|\/+$/g, "");
  return `npx --yes tiged ${owner}/${repo}/${sub} ${destParent}/${destFolderName}`;
}

/** Local Python helper shipped with this registry repo */
export function buildPythonAddCommand(componentId: string, destParent = "defs/components"): string {
  return `python tools/add_component.py ${componentId} --dest ${destParent}`;
}
