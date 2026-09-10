/** Standalone Dagster+ CLI scripts shipped in the dagster-component-templates
 *  repo under cli/. Consumed by both /cli (index) and /cli/:id (detail).
 *
 *  These are NOT components — no manifest entry, no `dagster-component add`
 *  path, no install into a Dagster project. Customers curl the .py, chmod,
 *  and run standalone against a Dagster+ user API token. Kept as a hardcoded
 *  const because there are three of them and they change rarely; adding a
 *  fourth = append one entry here.
 */

export type CliScript = {
  id: string;
  title: string;
  category: "sync" | "pull";
  oneLiner: string;
  description: string;
  usage: string;
  rawUrl: string;
  githubUrl: string;
  readmeUrl: string;
  requires: string[];
};

// NB: real repo name is `dagster-component-templates`, NOT
// `dagster-community-components` (which is the PyPI package name — the repo
// name on GitHub differs).
const REPO = "https://github.com/eric-thomas-dagster/dagster-component-templates";
const RAW  = "https://raw.githubusercontent.com/eric-thomas-dagster/dagster-component-templates/main";
const READMEURL = `${RAW}/cli/README.md`;

export const CLIS: CliScript[] = [
  {
    id: "sync_catalog_views",
    title: "sync_catalog_views.py",
    category: "sync",
    oneLiner: "GitOps sync of Catalog Views (named asset selections) to a Dagster+ deployment.",
    description:
      "Push a YAML manifest of Catalog Views into a Dagster+ deployment via the real GraphQL API " +
      "(`createOrUpdateCatalogView`). Idempotent — matches by view name and updates in place; " +
      "creates new views when unmatched. `--dry-run` previews without touching the deployment; " +
      "`--prune` optionally removes views not in the manifest.",
    usage:
`export DAGSTER_CLOUD_API_TOKEN=user:xxxxxxxx

curl -fsSL ${RAW}/cli/sync_catalog_views.py -o sync_catalog_views.py
chmod +x sync_catalog_views.py

./sync_catalog_views.py sync catalog_views.yaml \\
    --deployment-url https://acme.dagster.cloud/prod \\
    --dry-run`,
    rawUrl: `${RAW}/cli/sync_catalog_views.py`,
    githubUrl: `${REPO}/blob/main/cli/sync_catalog_views.py`,
    readmeUrl: READMEURL,
    requires: ["Python 3.8+", "PyYAML (`pip install pyyaml`)", "Dagster+ user API token"],
  },
  {
    id: "sync_custom_metrics",
    title: "sync_custom_metrics.py",
    category: "sync",
    oneLiner: "GitOps sync of custom Insights metrics to a Dagster+ deployment.",
    description:
      "Push a YAML manifest of custom Insights metrics into a Dagster+ deployment via " +
      "`createCustomMetric` / `updateCustomMetric`. Idempotent — matches by " +
      "`metadata_key` and updates in place. Supports `unit_type: INTEGER | TIME_MS | " +
      "TIME_SECONDS | FLOAT | BYTES`. `--dry-run` + `--prune` flags as with catalog views.",
    usage:
`export DAGSTER_CLOUD_API_TOKEN=user:xxxxxxxx

curl -fsSL ${RAW}/cli/sync_custom_metrics.py -o sync_custom_metrics.py
chmod +x sync_custom_metrics.py

./sync_custom_metrics.py sync metrics.yaml \\
    --deployment-url https://acme.dagster.cloud/prod \\
    --dry-run`,
    rawUrl: `${RAW}/cli/sync_custom_metrics.py`,
    githubUrl: `${REPO}/blob/main/cli/sync_custom_metrics.py`,
    readmeUrl: READMEURL,
    requires: ["Python 3.8+", "PyYAML (`pip install pyyaml`)", "Dagster+ user API token"],
  },
  {
    id: "pull_credit_usage",
    title: "pull_credit_usage.py",
    category: "pull",
    oneLiner: "Pull Dagster+ credit usage sliced by deployment × code location × asset × day.",
    description:
      "The Dagster+ UI shows credit usage under Insights but doesn't expose a cross-" +
      "deployment / per-code-location / per-asset download as one report. This CLI hits " +
      "the same GraphQL endpoints the UI does (`reportingMetricsByAsset` on both the " +
      "VICTORIA_METRICS + POSTGRES stores) and merges into one table. Handles the " +
      "120-day API cap by auto-chunking longer windows; unions the two metric stores so " +
      "date ranges spanning VM's ~6-month retention pick up the historical POSTGRES data.",
    usage:
`export DAGSTER_CLOUD_API_TOKEN=user:xxxxxxxx

curl -fsSL ${RAW}/cli/pull_credit_usage.py -o pull_credit_usage.py
chmod +x pull_credit_usage.py

# List deployments in the org (validates token):
./pull_credit_usage.py --org acme deployments

# 9-month credit usage per deployment × code location × asset × day, CSV:
./pull_credit_usage.py --org acme \\
    credits --start 2026-01-01 --end 2026-09-30 \\
    --group-by deployment,code_location,asset,day \\
    --output-csv credits.csv`,
    rawUrl: `${RAW}/cli/pull_credit_usage.py`,
    githubUrl: `${REPO}/blob/main/cli/pull_credit_usage.py`,
    readmeUrl: READMEURL,
    requires: ["Python 3.8+ (stdlib only — no external deps)", "Dagster+ user API token"],
  },
];

export function findCli(id: string): CliScript | undefined {
  return CLIS.find((c) => c.id === id);
}

export const CLI_REPO = REPO;
