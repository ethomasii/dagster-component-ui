import { buildInstallBundle } from "./registryRequirements";

/** @deprecated use buildInstallBundle — kept for any import sites */
export function buildInstallSnippet(pip: string[] | undefined): string {
  return buildInstallBundle(pip).copyAll;
}

export function githubTreeUrl(repo: string, componentPath: string): string {
  const r = repo.replace(/\.git$/, "").replace(/\/$/, "");
  return `${r}/tree/main/${componentPath}`;
}
