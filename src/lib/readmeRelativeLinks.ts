/**
 * READMEs in dagster-component-templates use links relative to the file's own
 * path (e.g. `examples/foo/README.md`, `../agent_card/README.md`) — correct
 * when GitHub renders the file in place, but broken once we fetch the raw
 * markdown and render it on this site, where there is no repo-relative base.
 * Resolve such a link against the README's own raw.githubusercontent.com URL
 * into an absolute GitHub URL so it still works here.
 */
export function resolveReadmeRelativeLink(href: string, readmeRawUrl: string): string {
  if (!href) return href;

  const hashIndex = href.indexOf("#");
  const path = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : href.slice(hashIndex);
  if (!path) return href;

  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("//")) return href;

  const m = readmeRawUrl.match(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.*)$/
  );
  if (!m) return href;
  const [, owner, repo, branch, filePath] = m;
  const baseDir = filePath.split("/").slice(0, -1).join("/");

  const combined = path.startsWith("/") ? path.slice(1) : `${baseDir}/${path}`;
  const resolved: string[] = [];
  for (const seg of combined.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") resolved.pop();
    else resolved.push(seg);
  }

  const kind = path.endsWith("/") ? "tree" : "blob";
  return `https://github.com/${owner}/${repo}/${kind}/${branch}/${resolved.join("/")}${hash}`;
}
