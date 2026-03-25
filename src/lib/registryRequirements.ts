/**
 * Baselines shown in the UI for “works with” / install hints.
 * The manifest does not carry Dagster or Python pins per component; treat these as
 * registry defaults (tune here to match your deployment policy).
 */
export const REGISTRY_DAGSTER_SPEC = ">=1.8.0";
export const REGISTRY_PYTHON_SPEC = ">=3.10";

/** Primary install line for Dagster + dagster-components. */
export function pipInstallDagsterCore(): string {
  return `pip install "dagster${REGISTRY_DAGSTER_SPEC}" "dagster-components"`;
}

export function pipInstallTemplatePackages(pip: string[]): string {
  if (!pip.length) return "";
  return `pip install ${pip.map((p) => `"${p}"`).join(" ")}`;
}

export function buildInstallBundle(
  pip: string[] | undefined,
  opts?: { componentPath?: string; hasRequirementsFile?: boolean }
): {
  coreInstall: string;
  templateInstall: string | null;
  copyAll: string;
  /** Full copy-paste: framework + why no per-component pip + copy path + deps */
  fullGuide: string;
} {
  const coreInstall = pipInstallDagsterCore();
  const templateInstall = pip?.length ? pipInstallTemplatePackages(pip) : null;

  const relPath = opts?.componentPath ?? "path/to/component";

  const copyAll = templateInstall
    ? `${coreInstall}\n\n# Template-specific packages (from manifest)\n${templateInstall}`
    : `${coreInstall}\n\n# No extra pip packages listed in the manifest for this template.`;

  const lines = [
    "# --- Dagster (always from PyPI) ---",
    coreInstall,
    "",
    "# --- There is NO pip package for this single component ---",
    "# Templates live in the GitHub repo: copy the folder into your project (e.g. defs/components/).",
    "# Then install the template's Python deps (manifest list below, or requirements.txt in that folder).",
    "",
    "# --- Copy this folder from a clone of dagster-component-templates ---",
    `# cp -r dagster-component-templates/${relPath} ./defs/components/`,
  ];
  if (opts?.hasRequirementsFile) {
    lines.push(
      "",
      "# --- Or install from requirements.txt after copying ---",
      "# pip install -r defs/components/<your-folder>/requirements.txt"
    );
  }
  if (templateInstall) {
    lines.push("", "# --- Same deps as one pip line (from manifest) ---", templateInstall);
  } else {
    lines.push("", "# (No extra pip lines in manifest — add what your code needs.)");
  }

  const fullGuide = lines.join("\n");

  return { coreInstall, templateInstall, copyAll, fullGuide };
}
