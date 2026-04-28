import { parseGithubRepo } from "./github";
import type { ManifestComponent } from "../types";

/** Bad placeholder from older manifests — treat as absent and synthesize URLs. */
const PLACEHOLDER_ORG_RE = /your-org(?=[/.-])/i;

/** `https://raw.githubusercontent.com/{owner}/{repo}/main/{path}` folder base (no trailing slash). */
export function githubRawFolderBase(repoUrl: string, folderPathRelative: string): string | null {
  const p = parseGithubRepo(repoUrl);
  if (!p) return null;
  const sub = folderPathRelative.replace(/^\/+|\/+$/g, "");
  return `https://raw.githubusercontent.com/${p.owner}/${p.repo}/main/${sub}`;
}

export type EffectiveTemplateUrls = {
  schema_url?: string;
  readme_url?: string;
  component_url?: string;
  example_url?: string;
  requirements_url?: string;
};

function pickExplicitOrRaw(
  explicit: string | undefined | null,
  fileName: string | undefined,
  base: string | null
): string | undefined {
  const e = (explicit ?? "").trim();
  if (e && !PLACEHOLDER_ORG_RE.test(e)) return e;
  if (!base || !fileName) return undefined;
  return `${base}/${fileName}`;
}

/**
 * Prefer explicit manifest URLs unless they contain placeholder orgs (`your-org`).
 * Otherwise synthesize from `manifest.repository` + `path`.
 */
export function effectiveTemplateUrls(
  manifest: ManifestComponent | null | undefined,
  repoUrl: string
): EffectiveTemplateUrls {
  if (!manifest) return {};

  const base =
    repoUrl?.trim() && manifest.path?.trim()
      ? githubRawFolderBase(repoUrl, manifest.path)
      : null;

  const out: EffectiveTemplateUrls = {};

  const s = pickExplicitOrRaw(manifest.schema_url, "schema.json", base);
  const r = pickExplicitOrRaw(manifest.readme_url, "README.md", base);
  const c = pickExplicitOrRaw(manifest.component_url, "component.py", base);
  const ex = pickExplicitOrRaw(manifest.example_url, "example.yaml", base);
  const req = pickExplicitOrRaw(manifest.requirements_url, "requirements.txt", base);

  if (s) out.schema_url = s;
  if (r) out.readme_url = r;
  if (c) out.component_url = c;
  if (ex) out.example_url = ex;
  if (req) out.requirements_url = req;

  return out;
}
