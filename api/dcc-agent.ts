/**
 * DCC Agent — Vercel serverless endpoint.
 *
 * POST /api/dcc-agent
 * Body: { intent: string, options?: { include_shell_script?: boolean } }
 *
 * Multi-turn tool-use loop:
 *
 *   1. Server sends Claude the FULL component catalog (every entry,
 *      not a lossy keyword-filtered subset) in a fixed, intent-
 *      independent order — never reordered or truncated per query, so
 *      the block stays byte-identical across requests and caches
 *      across users, not just within one conversation (see "Prompt
 *      caching" below). Matched playbooks still surface as a short,
 *      per-query hint pointing Claude at specific components by name.
 *   2. Claude gets the full catalog + optional playbook hint and
 *      can call `fetch_component_schema(name)` to drill into any
 *      component's real schema (so defs.yaml uses actual field names,
 *      not hallucinated ones).
 *   3. When Claude has enough context it calls `answer(...)` with the
 *      final recommendations + defs snippets + optional shell script.
 *
 * Prompt caching: the system prompt and the static catalog/walkthroughs/
 * official-integrations block are identical across every request
 * (they don't depend on `intent`), so both get an explicit `cache_control`
 * breakpoint — the first request in any 5-minute window pays full price,
 * every request after it (across ALL users, not just one conversation)
 * reads that block at ~1/10th the cost. The growing tool-loop tail within
 * one request is covered by top-level automatic caching. Only the
 * `Intent: ...` line and per-query playbook hints sit after the last
 * breakpoint.
 *
 * Env vars:
 *   ANTHROPIC_API_KEY   — required, server-side only
 *   DCC_AGENT_MODEL     — optional override; default claude-sonnet-5-5
 */
import Anthropic from "@anthropic-ai/sdk";

// ── Manifest + docs cache ─────────────────────────────────────────────
const RAW_BASE =
  "https://raw.githubusercontent.com/eric-thomas-dagster/dagster-component-templates/main";
const MANIFEST_URL = `${RAW_BASE}/manifest.json`;

// Walkthroughs live in a separate repo (dagster-community-components-cli).
// Small index (~30k tokens) is inlined in the prompt; individual walkthrough
// files are fetched on demand via the fetch_walkthrough tool.
const WALKTHROUGHS_RAW_BASE =
  "https://raw.githubusercontent.com/eric-thomas-dagster/dagster-community-components-cli/main/examples";
const WALKTHROUGHS_INDEX_URL = `${WALKTHROUGHS_RAW_BASE}/README.md`;

// The dagster-community-components Claude Code skill (same repo, published
// for Claude Code / Claude.ai use) is plain markdown — no scripts — so it's
// just as fetchable here. SKILL.md itself (short: hard rules + CLI quick
// reference + decision table) is inlined in the static prompt; its deeper
// reference/*.md topic files are fetched on demand via fetch_skill_reference,
// mirroring fetch_walkthrough.
const SKILL_RAW_BASE =
  "https://raw.githubusercontent.com/eric-thomas-dagster/dagster-community-components-cli/main/skills/dagster-community-components";
const SKILL_MD_URL = `${SKILL_RAW_BASE}/SKILL.md`;
const SKILL_REFERENCE_TOPICS = ["catalog", "cli", "writing-yaml", "demo-workflow"] as const;
type SkillReferenceTopic = (typeof SKILL_REFERENCE_TOPICS)[number];

const CACHE_TTL_MS = 5 * 60 * 1000;
const SCHEMA_CACHE_TTL_MS = 30 * 60 * 1000;
const READMES_CACHE_TTL_MS = 30 * 60 * 1000;

type ManifestComponent = {
  id?: string;
  name?: string;
  path?: string;
  category?: string;
  description?: string;
  tags?: string[];
  keywords?: string[];
  vendor?: string;
  vendors?: string[];
  agent_hints?: Record<string, unknown>;
  produces?: string[];
  readme_url?: string;
  schema_url?: string;
  example_url?: string;
};
type Manifest = { version: string; total?: number; components: ManifestComponent[] };

let cachedManifest: { at: number; data: Manifest } | null = null;
let cachedWalkthroughsIndex: { at: number; data: string } | null = null;
let cachedSkillMd: { at: number; data: string } | null = null;
const schemaCache: Map<string, { at: number; data: unknown }> = new Map();
const readmeCache: Map<string, { at: number; data: string }> = new Map();
const walkthroughCache: Map<string, { at: number; data: string }> = new Map();
const skillReferenceCache: Map<string, { at: number; data: string }> = new Map();

async function loadManifest(): Promise<Manifest> {
  const now = Date.now();
  if (cachedManifest && now - cachedManifest.at < CACHE_TTL_MS) return cachedManifest.data;
  const r = await fetch(MANIFEST_URL);
  if (!r.ok) throw new Error(`manifest fetch failed: HTTP ${r.status}`);
  const data = (await r.json()) as Manifest;
  cachedManifest = { at: now, data };
  return data;
}

async function loadWalkthroughsIndex(): Promise<string> {
  const now = Date.now();
  if (cachedWalkthroughsIndex && now - cachedWalkthroughsIndex.at < CACHE_TTL_MS) {
    return cachedWalkthroughsIndex.data;
  }
  const r = await fetch(WALKTHROUGHS_INDEX_URL);
  if (!r.ok) {
    // Non-fatal — agent can still function without the walkthroughs index.
    return "";
  }
  const data = await r.text();
  cachedWalkthroughsIndex = { at: now, data };
  return data;
}

async function loadComponentSchema(component: ManifestComponent): Promise<unknown> {
  if (!component.schema_url) {
    return { error: `component '${component.name}' has no schema_url` };
  }
  const key = component.schema_url;
  const now = Date.now();
  const hit = schemaCache.get(key);
  if (hit && now - hit.at < SCHEMA_CACHE_TTL_MS) return hit.data;
  const r = await fetch(component.schema_url);
  if (!r.ok) return { error: `schema fetch failed for '${component.name}': HTTP ${r.status}` };
  const data = await r.json();
  schemaCache.set(key, { at: now, data });
  return data;
}

async function loadComponentReadme(component: ManifestComponent): Promise<string> {
  if (!component.readme_url) {
    return `[error: component '${component.name}' has no readme_url]`;
  }
  const key = component.readme_url;
  const now = Date.now();
  const hit = readmeCache.get(key);
  if (hit && now - hit.at < READMES_CACHE_TTL_MS) return hit.data;
  const r = await fetch(component.readme_url);
  if (!r.ok) return `[error: README fetch failed for '${component.name}': HTTP ${r.status}]`;
  const text = await r.text();
  // Trim aggressively — READMEs can be 20+ KB and we don't want to blow
  // context. Cap at 12k chars per fetch; agent can re-fetch if truncated
  // matters to a specific answer.
  const trimmed = text.length > 12000
    ? text.slice(0, 12000) + `\n\n[... truncated at 12000 chars; full README at ${component.readme_url}]`
    : text;
  readmeCache.set(key, { at: now, data: trimmed });
  return trimmed;
}

async function loadWalkthrough(slug: string): Promise<string> {
  const cleaned = slug.replace(/\.md$/i, "");
  const now = Date.now();
  const hit = walkthroughCache.get(cleaned);
  if (hit && now - hit.at < READMES_CACHE_TTL_MS) return hit.data;
  // Two layouts: examples/<slug>/README.md OR examples/<slug>.md (older).
  const candidates = [
    `${WALKTHROUGHS_RAW_BASE}/${cleaned}/README.md`,
    `${WALKTHROUGHS_RAW_BASE}/${cleaned}.md`,
  ];
  let lastStatus = 0;
  for (const url of candidates) {
    const r = await fetch(url);
    if (r.ok) {
      const text = await r.text();
      const trimmed = text.length > 20000
        ? text.slice(0, 20000) + `\n\n[... truncated at 20000 chars; full walkthrough at ${url}]`
        : text;
      walkthroughCache.set(cleaned, { at: now, data: trimmed });
      return trimmed;
    }
    lastStatus = r.status;
  }
  return `[error: walkthrough '${cleaned}' not found; last HTTP status ${lastStatus}]`;
}

async function loadSkillMd(): Promise<string> {
  const now = Date.now();
  if (cachedSkillMd && now - cachedSkillMd.at < CACHE_TTL_MS) return cachedSkillMd.data;
  const r = await fetch(SKILL_MD_URL);
  if (!r.ok) {
    // Non-fatal — agent still works without it, just loses the hard-rules
    // recap and CLI quick reference in its static prompt.
    return "";
  }
  const data = await r.text();
  cachedSkillMd = { at: now, data };
  return data;
}

async function loadSkillReference(topic: SkillReferenceTopic): Promise<string> {
  const now = Date.now();
  const hit = skillReferenceCache.get(topic);
  if (hit && now - hit.at < READMES_CACHE_TTL_MS) return hit.data;
  const url = `${SKILL_RAW_BASE}/reference/${topic}.md`;
  const r = await fetch(url);
  if (!r.ok) return `[error: skill reference '${topic}' fetch failed: HTTP ${r.status}]`;
  const text = await r.text();
  skillReferenceCache.set(topic, { at: now, data: text });
  return text;
}

// ── Playbooks — canned patterns for the most-common asks ──────────────
//
// When the intent regex-matches a playbook, we inject a "playbook hint"
// into the dynamic (uncached) part of the prompt — the full catalog is
// always sent regardless (see header comment), so playbooks no longer
// need to boost anything into a candidate list. Keeps the agent accurate
// on the ~80% happy path by pointing it straight at the right components
// instead of relying purely on the model finding them unaided.
type Playbook = {
  name: string;
  match: RegExp;
  hint: string;
  boost_components: string[]; // exact component names from the manifest
};

const PLAYBOOKS: Playbook[] = [
  {
    name: "migrating-airflow-to-dagster",
    match: /\bairflow\b|\bmwaa\b|cloud composer|astronomer|\bdags?\b.{0,20}(migrat|port|convert|move)|(migrat|port|convert|move).{0,20}\bdags?\b/i,
    hint:
      "This is a MIGRATION ask (an existing Airflow/MWAA/Cloud Composer/Astronomer project moving to Dagster), not a \"build something new from the component catalog\" ask. Do NOT try to answer this with a DCC component list alone. Your summary MUST name and link the published `migrating-airflow-to-dagster` skill (https://github.com/eric-thomas-dagster/dagster-community-components-cli/blob/main/skills/migrating-airflow-to-dagster/SKILL.md) as the primary answer, and say to load `dagster-expert` alongside it. You may ALSO mention specific DCC components that help during migration (e.g. a bridge/orchestrator or script-wrapping component) as a secondary note, but the skill citation is the answer, not optional color.",
    boost_components: [],
  },
  {
    name: "migrating-adf-to-dagster",
    match: /azure data factory|\badf\b.{0,20}(migrat|port|convert|move)|(migrat|port|convert|move).{0,20}\badf\b|synapse pipeline|fabric data factory/i,
    hint:
      "This is a MIGRATION ask (an existing Azure Data Factory / Synapse pipelines / Fabric Data Factory project moving to Dagster), not a \"build something new\" ask. Your summary MUST name and link the published `migrating-adf-to-dagster` skill (https://github.com/eric-thomas-dagster/dagster-community-components-cli/blob/main/skills/migrating-adf-to-dagster/SKILL.md) as the primary answer, and say to load `dagster-expert` alongside it.",
    boost_components: [],
  },
  {
    name: "migrating-runmyjobs-to-dagster",
    match: /runmyjobs|run my jobs|redwood (server|cps)|\bsap cps\b/i,
    hint:
      "This is a MIGRATION ask (an existing Redwood RunMyJobs / SAP CPS project moving to Dagster), not a \"build something new\" ask. Your summary MUST name and link the published `migrating-runmyjobs-to-dagster` skill (https://github.com/eric-thomas-dagster/dagster-community-components-cli/blob/main/skills/migrating-runmyjobs-to-dagster/SKILL.md) as the primary answer, and say to load `dagster-expert` alongside it.",
    boost_components: [],
  },
  {
    name: "salesforce-to-warehouse",
    match: /salesforce|sfdc|\bcrm\b/i,
    hint:
      "Salesforce Ingestion supports a `destination` config field (dlt destinations: bigquery, snowflake, postgres, filesystem, ...) so a Salesforce → warehouse pipeline can be ONE component + a schedule. If the user also wants pre-write schema validation, use the DataFrame path + Pandera Asset Check + a separate warehouse sink — but call out both options in `assumptions`.",
    boost_components: [
      "Salesforce Ingestion",
      "Salesforce Resource",
      "DataFrame to BigQuery",
      "DataFrame to Snowflake",
      "Pandera Asset Check",
    ],
  },
  {
    name: "github-to-warehouse",
    match: /\bgithub\b/i,
    hint:
      "For GitHub issues/PRs/commits ingestion, prefer the GitHub-specific dlt ingestion component with `destination` set for direct writes. Add Pandera Asset Check only if the user explicitly asks for pre-write validation.",
    boost_components: [
      "GitHub Ingestion",
      "GitHub Resource",
      "DataFrame to BigQuery",
      "DataFrame to Snowflake",
    ],
  },
  {
    name: "stripe-to-warehouse",
    match: /\bstripe\b/i,
    hint:
      "Stripe Ingestion supports `destination` for direct-to-warehouse. Recommend that shape unless the user explicitly wants intermediate validation.",
    boost_components: ["Stripe Ingestion", "DataFrame to BigQuery", "DataFrame to Snowflake"],
  },
  {
    name: "dbt-transformation",
    match: /\bdbt\b/i,
    hint:
      "dbt runs are its own component (official dagster-dbt integration). If the user mentions freshness / test failures, add a freshness check and Slack alert.",
    boost_components: ["Dbt Project Component"],
  },
  {
    name: "sql-source-to-warehouse",
    match: /(postgres|mysql|mssql|oracle|db2|redshift|snowflake)\s*(to|→|->)\s*(bigquery|snowflake|redshift|postgres|databricks)/i,
    hint:
      "Cross-warehouse replication uses `Database Replication` (row-level, ongoing) or `Database Tables Migration` (schema-first, one-shot). Prefer Replication for periodic sync; Migration for one-time lift.",
    boost_components: ["Database Replication", "Database Tables Migration"],
  },
  {
    name: "sensor-driven-ingest",
    match: /(when|whenever|on).{0,30}(new|dropped|arrives|lands|uploaded).{0,30}(file|s3|gcs|azure|blob)/i,
    hint:
      "Event-driven ingestion of files should use a filesystem/S3 sensor component to trigger a materialization of the downstream ingest asset.",
    boost_components: ["Filesystem Monitor", "S3 Filesystem Monitor"],
  },
  {
    name: "ml-scoring",
    match: /(score|predict|inference|classifier|model).{0,30}(nightly|daily|hourly|batch)/i,
    hint:
      "For batch ML scoring: pull features (Ingestion component), score with a model asset (see xgboost / sklearn / openai components depending on model type), write predictions back with a DataFrame-to-<warehouse> sink.",
    boost_components: ["DataFrame to BigQuery", "DataFrame to Snowflake", "DataFrame to Postgres"],
  },
];

function matchPlaybooks(intent: string): Playbook[] {
  return PLAYBOOKS.filter((p) => p.match.test(intent));
}

// ── Official Dagster integrations (docs.dagster.io/integrations/libraries) ─
//
// Sourced 2026-09 from docs.dagster.io. The registry repo
// intentionally does NOT duplicate any official `dagster-<vendor>`
// integration — when a user asks about one of these vendors, the agent
// should recommend the official package + link to its docs rather than
// try to shoehorn a registry component in.
//
// One line per integration: `vendor | pip-package | docs-slug`.
// Docs URL = https://docs.dagster.io/integrations/libraries/<slug>.
const OFFICIAL_INTEGRATIONS: Array<[string, string, string]> = [
  ["ADBC", "dagster-adbc", "adbc"],
  ["Airbyte", "dagster-airbyte", "airbyte"],
  ["Airlift", "dagster-airlift", "airlift"],
  ["Anthropic", "dagster-anthropic", "anthropic"],
  ["Apprise", "dagster-apprise", "apprise"],
  ["Atlan", "dagster-atlan", "atlan"],
  ["AWS", "dagster-aws", "aws"],
  ["Azure", "dagster-azure", "azure"],
  ["Celery", "dagster-celery", "celery"],
  ["Census", "dagster-census", "census"],
  ["Chroma", "dagster-chroma", "chroma"],
  ["ClickHouse", "dagster-clickhouse", "clickhouse"],
  ["Cube", "dagster-cube", "cube"],
  ["Dask", "dagster-dask", "dask"],
  ["Databricks", "dagster-databricks", "databricks"],
  ["Datadog", "dagster-datadog", "datadog"],
  ["Datahub", "dagster-datahub", "datahub"],
  ["HF Datasets", "dagster-hf-datasets", "hf-datasets"],
  ["dbt", "dagster-dbt", "dbt"],
  ["Delta Lake", "dagster-deltalake", "deltalake"],
  ["DingTalk", "dagster-dingtalk", "dingtalk"],
  ["dlt", "dagster-dlt", "dlt"],
  ["Docker", "dagster-docker", "docker"],
  ["Elasticsearch", "dagster-elasticsearch", "elasticsearch"],
  ["Evidence", "dagster-evidence", "evidence"],
  ["Fivetran", "dagster-fivetran", "fivetran"],
  ["GCP", "dagster-gcp", "gcp"],
  ["Gemini", "dagster-gemini", "gemini"],
  ["GitHub", "dagster-github", "github"],
  ["Great Expectations", "dagster-great-expectations", "great-expectations"],
  ["HashiCorp Nomad", "dagster-hashicorp-nomad", "hashicorp-nomad"],
  ["HashiCorp Vault", "dagster-hashicorp", "hashicorp"],
  ["Hex", "dagster-hex", "hex"],
  ["Hightouch", "dagster-hightouch", "hightouch"],
  ["Iceberg", "dagster-iceberg", "iceberg"],
  ["Java", "dagster-java", "java"],
  ["Jupyter Notebooks", "dagster-jupyter", "jupyter"],
  ["Kubernetes", "dagster-k8s", "kubernetes"],
  ["LakeFS", "dagster-lakefs", "lakefs"],
  ["Looker", "dagster-looker", "looker"],
  ["Meltano", "dagster-meltano", "meltano"],
  ["MLflow", "dagster-mlflow", "mlflow"],
  ["Modal", "dagster-modal", "modal"],
  ["MotherDuck", "dagster-motherduck", "motherduck"],
  ["MSSQL Bulk Copy Tool", "dagster-mssql-bulk-copy-tool", "mssql-bulk-copy-tool"],
  ["Microsoft Teams", "dagster-msteams", "msteams"],
  ["MySQL", "dagster-mysql", "mysql"],
  ["Not Diamond", "dagster-notdiamond", "notdiamond"],
  ["obstore", "dagster-obstore", "obstore"],
  ["Omni", "dagster-omni", "omni"],
  ["Open Metadata", "dagster-open-metadata", "open-metadata"],
  ["OpenAI", "dagster-openai", "openai"],
  ["OpenLineage", "dagster-openlineage", "openlineage"],
  ["PagerDuty", "dagster-pagerduty", "pagerduty"],
  ["Pandas", "dagster-pandas", "pandas"],
  ["Pandera", "dagster-pandera", "pandera"],
  ["Papertrail", "dagster-papertrail", "papertrail"],
  ["Patito", "dagster-patito", "patito"],
  ["Perian", "dagster-perian", "perian"],
  ["Dagster Pipes", "dagster-pipes", "pipes"],
  ["Polars", "dagster-polars", "polars"],
  ["Postgres", "dagster-postgres", "postgres"],
  ["Power BI", "dagster-powerbi", "powerbi"],
  ["Prometheus", "dagster-prometheus", "prometheus"],
  ["PySpark", "dagster-pyspark", "pyspark"],
  ["Qdrant", "dagster-qdrant", "qdrant"],
  ["Ray", "dagster-ray", "ray"],
  ["Rust", "dagster-rust", "rust"],
  ["Salesforce", "dagster-salesforce", "salesforce"],
  ["Secoda", "dagster-secoda", "secoda"],
  ["SFTP", "dagster-sftp", "sftp"],
  ["SharePoint", "dagster-sharepoint", "sharepoint"],
  ["Sigma", "dagster-sigma", "sigma"],
  ["Slack", "dagster-slack", "slack"],
  ["Sling", "dagster-sling", "sling"],
  ["SLURM", "dagster-slurm", "slurm"],
  ["Snowflake", "dagster-snowflake", "snowflake"],
  ["Soda", "dagster-soda", "soda"],
  ["Spark", "dagster-spark", "spark"],
  ["SSH", "dagster-ssh", "ssh"],
  ["Tableau", "dagster-tableau", "tableau"],
  ["Teradata", "dagster-teradata", "teradata"],
  ["Twilio", "dagster-twilio", "twilio"],
  ["TypeScript", "dagster-typescript", "typescript"],
  ["Weights & Biases", "dagster-wandb", "wandb"],
  ["Weaviate", "dagster-weaviate", "weaviate"],
];

function formatOfficialIntegrations(): string {
  return OFFICIAL_INTEGRATIONS
    .map(([v, p, s]) => `  ${v} — ${p} — https://docs.dagster.io/integrations/libraries/${s}`)
    .join("\n");
}

// ── Compact catalog for the LLM prompt ────────────────────────────────
function compactLine(c: ManifestComponent): string {
  const hints = c.agent_hints || {};
  const io =
    hints.input_type || hints.output_type
      ? ` [io: ${hints.input_type ?? "?"} → ${hints.output_type ?? "?"}]`
      : "";
  const vendor = c.vendor ? ` v:${c.vendor}` : "";
  const tagSet = new Set<string>();
  (c.tags || []).forEach((t) => tagSet.add(t));
  (c.keywords || []).forEach((t) => tagSet.add(t));
  const tags = Array.from(tagSet).slice(0, 10).join(",");
  // id is the real slug `dagster-component add <id>` needs — don't make
  // the model guess a snake_case transform of the display name, which
  // isn't always right (e.g. display name casing/words that don't map
  // 1:1 to the id).
  const id = c.id ? ` id:${c.id}` : "";
  return `${c.name}${id} (${c.category})${vendor}${io} — ${c.description}${tags ? ` #${tags}` : ""}`;
}

// ── Relevance ranking (no longer a lossy pre-filter — sorts the FULL
// catalog so likely matches render first; nothing is dropped) ─────────
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "with", "into",
  "from", "at", "by", "as", "is", "are", "be", "my", "our", "your", "their",
  "every", "each", "some", "all", "any", "that", "this", "these", "those",
  "then", "want", "need", "would", "like", "please", "just", "also", "how",
  "what", "when", "where", "who", "why", "should", "can", "could", "will",
  "do", "does", "make", "run", "get", "set",
]);

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9_]+/g) || []).filter(
    (t) => t.length > 1 && !STOPWORDS.has(t),
  );
}

/** Sorts (never truncates) the catalog by relevance to `intent`, with
 * playbook-named components boosted to the front. `topK` is optional —
 * pass it only for the narrower README-body-search shortlist, which has
 * a real cost (one HTTP fetch per candidate), unlike this ranking pass. */
function scoreCatalog(
  components: ManifestComponent[],
  intent: string,
  boostNames: Set<string>,
  topK?: number,
): ManifestComponent[] {
  const intentTokens = tokenize(intent);
  const intentSet = new Set(intentTokens);

  const scored = components
    .filter((c) => c.name)
    .map((c) => {
      const nameToks = tokenize(c.name || "");
      const descToks = tokenize(c.description || "");
      const tagToks = [
        ...tokenize((c.tags || []).join(" ")),
        ...tokenize((c.keywords || []).join(" ")),
        ...tokenize(c.vendor || ""),
        ...tokenize((c.vendors || []).join(" ")),
      ];
      let score = 0;
      for (const t of intentTokens) {
        if (nameToks.includes(t)) score += 4;
        if (tagToks.includes(t)) score += 3;
        if (descToks.includes(t)) score += 1;
      }
      const tagsHit = tagToks.filter((t) => intentSet.has(t)).length;
      score += Math.min(tagsHit, 3);
      // Playbook boost: float this component to the front of the list.
      if (boostNames.has(c.name || "")) score += 100;
      return { c, score };
    });

  scored.sort((a, b) => b.score - a.score);
  const ranked = scored.map((x) => x.c);
  return topK != null ? ranked.slice(0, topK) : ranked;
}

// ── Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the DCC Agent — you recommend Dagster Community Components (DCC) for a user's data-engineering intent.

## Scope — registry components are the default; official integrations are the fallback; migration asks are a different thing entirely

You have THREE layers to choose from:

1. **Registry components (DCC)** — a large, growing catalog of higher-level, opinionated components (the full catalog is in the candidate list below). These are typically the *right* recommendation because they're purpose-built for common patterns (ingestion with baked-in schedules + destinations, agentic pipelines, sensor patterns, sinks with schema handling, etc.). Many are built ON TOP OF the official integrations to give a better ergonomic surface.

2. **Official Dagster integrations** — \`dagster-<vendor>\` PyPI packages maintained by Dagster (see OFFICIAL INTEGRATIONS block in the user message). These are LOWER-LEVEL building blocks — resources, IO managers, and primitive assets. Useful as a fallback when no registry component fits, or when the user explicitly asks about them.

3. **Migration skills** — published guides for moving an EXISTING project off a different scheduler/ETL tool onto Dagster, not for building something new. When the ask is "migrate/port/convert my X to Dagster" (X = Airflow/MWAA/Cloud Composer/Astronomer, Azure Data Factory/Synapse pipelines/Fabric Data Factory, or Redwood RunMyJobs/SAP CPS), recommending a handful of components is the WRONG answer — a migration is a structured, multi-phase project (inventory the existing DAGs/pipelines/jobs, classify, translate, validate, cut over), and each of these has a dedicated published skill for exactly that. Name the matching skill explicitly in your \`summary\` with its GitHub URL, and say to load \`dagster-expert\` alongside it:
   - Airflow / MWAA / Cloud Composer / Astronomer → \`migrating-airflow-to-dagster\` — https://github.com/eric-thomas-dagster/dagster-community-components-cli/blob/main/skills/migrating-airflow-to-dagster/SKILL.md
   - Azure Data Factory / Synapse pipelines / Fabric Data Factory → \`migrating-adf-to-dagster\` — https://github.com/eric-thomas-dagster/dagster-community-components-cli/blob/main/skills/migrating-adf-to-dagster/SKILL.md
   - Redwood RunMyJobs / SAP CPS → \`migrating-runmyjobs-to-dagster\` — https://github.com/eric-thomas-dagster/dagster-community-components-cli/blob/main/skills/migrating-runmyjobs-to-dagster/SKILL.md
   You may still mention specific DCC components relevant to the migration (e.g. a bridge/orchestrator component for a phased cutover) in \`recommendations\`, but the skill citation belongs in \`summary\` and is the primary answer, not optional color — a bare component list with no skill mention is an incomplete answer to a migration ask.

**Recommendation policy (layers 1 and 2 — not migration asks, which are answered per #3 above):**

- **Prefer registry components when they exist.** Even for vendors with an official integration (Salesforce, Snowflake, dbt, etc.), the registry catalog often has a more useful, higher-level component that WRAPS the official one. Recommend the registry component; it's fine to note in \`assumptions\` that it builds on the official \`dagster-<vendor>\` package.
- **Fall back to official** when the candidate catalog genuinely has nothing that fits the intent — the vendor is covered ONLY by an official integration. Then cite the official package + link its docs URL in your \`summary\`.
- **Cite both** when the intent is ambiguous or the user might want to know both exist (e.g. "I need a Salesforce resource" → the registry's \`Salesforce Resource\` component OR the official \`dagster-salesforce\` package; different shapes, mention both briefly).
- **Never invent a registry component name.** Only recommend from the candidate catalog. If the candidate catalog doesn't have what's needed, use the official integration.

## Answer shape

Your final \`answer(...)\` call has three main fields:
  - **summary** — required. A 1-2 sentence direct reply. This is what the user reads first.
  - **recommendations** — 0-5 components with real defs.yaml (fields must match the schemas you fetched).
  - **walkthroughs** — 0-4 end-to-end demos.

**How to pick between recommendations vs walkthroughs:**
  - "How do I …?" / "Sync X to Y" / "Build a pipeline that …"  →  recommendations are primary; walkthroughs optional if there's a directly relevant demo.
  - "Do you have an example of …?" / "Show me a demo of …" / "Is there a walkthrough for …"  →  **walkthroughs are primary; recommendations are OPTIONAL** and only useful if the demo uses specific components worth pointing at.

## Tools

You have six tools available:

1. **fetch_component_schema(component_name)** — fetch the real schema.json for a candidate component. USE THIS before writing a defs.yaml snippet for any component you haven't previously fetched. The schema has the actual field names, types, required/optional flags, and defaults. Guessing field names from the compact catalog gives wrong YAML — always fetch first.

2. **fetch_component_readme(component_name)** — fetch the full README (~12KB trimmed). Use when the user asks HOW a component works (auth modes, incremental loading semantics, gotchas, examples) or when the schema alone doesn't give enough context to write a defs.yaml. Complements fetch_component_schema. Note: a README's hand-written \`## Configuration\` section (if present) can be stale — the auto-generated \`## Fields\` block between \`FIELDS:START\`/\`FIELDS:END\` markers (and schema.json itself) is the ground truth when they disagree.

3. **search_component_readmes(query)** — keyword-search across README bodies. Use when the intent needs a capability that isn't obviously in any component name/tag — e.g. "rate-limit handling", "incremental cursor", "schema evolution". Returns component names + relevant snippets.

4. **fetch_walkthrough(slug)** — fetch a full end-to-end demo walkthrough by slug. The walkthroughs index is inlined in the user message below — pick a slug from there. Best source for "do you have an example of X" questions.

5. **fetch_skill_reference(topic)** — fetch a deep-dive page (\`catalog\` | \`cli\` | \`writing-yaml\` | \`demo-workflow\`) from the published dagster-community-components skill for this exact registry. Use \`cli\` for CLI-usage questions, \`writing-yaml\` before generating a defs_snippet you're unsure about, \`catalog\` for registry-wide questions (categories, validation tiers, manifest schema), \`demo-workflow\` when composing a multi-stage demo from several components.

6. **answer(...)** — return the final ranked recommendations. Only call once you have enough context to write real defs.yaml snippets.

## How to work

You will receive the FULL candidate catalog (each line: name, category, vendor, IO types, description, tags/keywords) in no particular order — nothing has been filtered out, so read the whole list before concluding nothing fits. You may also receive playbook hints — short notes about how the ecosystem's best pattern for this intent shape. Weight playbook hints heavily.

**Picking rules:**

1. **Match every stage of the intent.** If the intent spans multiple stages, cover each one — unless a single component with the right config field can collapse multiple stages (see rule 4).
2. **Prefer native single-vendor components over generic multiplexers** when the intent names a vendor.
3. **Fetch schemas before writing YAML.** Every recommendation's defs.yaml must use fields that actually exist in the component's schema. Fetch first, write second.
4. **Look for collapse opportunities.** Many ingestion components have a \`destination\` (or similar) config field that lets one component do the ingest+sink in one asset. Fetch schemas and check. When a collapse is possible, ALSO mention the multi-component alternative in \`assumptions\` (e.g. "the two-step DataFrame → sink pattern is more useful if you want pre-write validation").
5. **Smallest set that solves the intent.** Never more than 5 components.
6. **Do NOT invent component names.** Only pick from the candidate catalog.

If include_shell_script is set, the shell script scaffolds a fresh project and adds each component:
  uvx create-dagster project my_project --uv-sync
  cd my_project
  dg add defs <component_name>/<component_name>.yaml
  ...

Always state assumptions (schedule cadence, target vendor, auth method, sync mode) so the user can correct you.`;

// ── Search across README bodies ───────────────────────────────────────
//
// Two-stage: score against compact summaries → top-60 candidates → fetch
// their README bodies concurrently → re-rank by body content. Uses the
// module-level README cache so repeat searches are near-free.
function countMatches(haystack: string, needles: string[]): number {
  const low = haystack.toLowerCase();
  let n = 0;
  for (const t of needles) {
    if (t.length < 2) continue;
    let idx = 0;
    while ((idx = low.indexOf(t, idx)) !== -1) {
      n += 1;
      idx += t.length;
    }
  }
  return n;
}

function bestSnippet(body: string, needles: string[], radius = 180): string {
  const low = body.toLowerCase();
  let bestIdx = -1;
  for (const t of needles) {
    if (t.length < 2) continue;
    const i = low.indexOf(t);
    if (i !== -1 && (bestIdx === -1 || i < bestIdx)) bestIdx = i;
  }
  if (bestIdx === -1) return body.slice(0, radius * 2);
  const start = Math.max(0, bestIdx - radius);
  const end = Math.min(body.length, bestIdx + radius);
  return (start > 0 ? "… " : "") + body.slice(start, end).replace(/\s+/g, " ").trim() + (end < body.length ? " …" : "");
}

async function searchComponentReadmes(
  components: ManifestComponent[],
  query: string,
  topN = 5,
): Promise<Array<{ component_name: string; category: string; snippet: string; score: number }>> {
  const tokens = tokenize(query);
  // Wider than the old cap (20) — this shortlist exists to bound the number
  // of README fetches (an I/O cost, not a model-context cost), so it can
  // afford to be generous now that the main catalog is no longer filtered.
  const shortlist = scoreCatalog(components, query, new Set(), 60);
  const bodies = await Promise.all(
    shortlist.map(async (c) => ({ c, body: await loadComponentReadme(c) })),
  );
  const scored = bodies
    .filter((b) => !b.body.startsWith("[error"))
    .map(({ c, body }) => ({
      component_name: c.name || "",
      category: c.category || "",
      score: countMatches(body, tokens),
      snippet: bestSnippet(body, tokens),
    }))
    .filter((r) => r.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}

// ── Tool definitions ──────────────────────────────────────────────────
const FETCH_SCHEMA_TOOL = {
  name: "fetch_component_schema",
  description:
    "Fetch the real schema.json for a candidate component so you can generate an accurate defs.yaml. Returns the schema's `attributes` map (field name → type + description + required flag + default). Call this before writing any defs.yaml snippet.",
  input_schema: {
    type: "object" as const,
    properties: {
      component_name: {
        type: "string",
        description: "Exact component name from the candidate catalog.",
      },
    },
    required: ["component_name"],
  },
};

const FETCH_README_TOOL = {
  name: "fetch_component_readme",
  description:
    "Fetch the full README.md for a component — richer than the compact catalog line. Use when the user asks HOW a component works (auth modes, gotchas, examples, incremental loading, config semantics) or when the schema alone doesn't answer the question. Returned text is trimmed to ~12KB — call again with a follow-up question if needed.",
  input_schema: {
    type: "object" as const,
    properties: {
      component_name: {
        type: "string",
        description: "Exact component name from the candidate catalog.",
      },
    },
    required: ["component_name"],
  },
};

const FETCH_WALKTHROUGH_TOOL = {
  name: "fetch_walkthrough",
  description:
    "Fetch a full end-to-end walkthrough by slug (from the walkthroughs index shown in the user message). Walkthroughs are live-validated demos with setup scripts, defs.yaml, and expected output — the best source for 'do you have an example of X' questions.",
  input_schema: {
    type: "object" as const,
    properties: {
      slug: {
        type: "string",
        description:
          "Walkthrough slug (filename without .md), e.g. 'mlflow_pipeline', 'crm_reconciliation', 'agentic_pipeline'.",
      },
    },
    required: ["slug"],
  },
};

const SEARCH_READMES_TOOL = {
  name: "search_component_readmes",
  description:
    "Keyword-search across component README bodies (not just the summaries in the candidate catalog). Use when the user's intent needs a capability that isn't named in any component name/tags but might be documented deep in a README — e.g. 'rate-limit handling', 'incremental cursor', 'schema evolution'. Returns component names + relevant snippets. Prefer this over guessing which component covers a niche capability.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Keywords or a short phrase describing the capability.",
      },
    },
    required: ["query"],
  },
};

const FETCH_SKILL_REFERENCE_TOOL = {
  name: "fetch_skill_reference",
  description:
    "Fetch a deep-dive reference page from the dagster-community-components Claude Code skill (the same registry you already have the candidate catalog for, with more context). Use 'cli' when the user asks about the dagster-component CLI itself (exact flags, install modes, `id@ref` pinning) rather than wanting a YAML recommendation. Use 'writing-yaml' before writing a defs_snippet for a component you're unsure about — it explains which part of a README is ground truth vs. stale, and the shared catalog-metadata/partition/source config conventions that repeat across most components. Use 'catalog' for questions about the registry itself (categories, validation tiers, manifest fields) rather than a specific component. Use 'demo-workflow' when asked to build a multi-stage end-to-end demo from the catalog.",
  input_schema: {
    type: "object" as const,
    properties: {
      topic: {
        type: "string",
        enum: SKILL_REFERENCE_TOPICS as unknown as string[],
        description: "Which reference page to fetch.",
      },
    },
    required: ["topic"],
  },
};

type ToolInput = {
  summary?: string;
  recommendations: Array<{
    component_name: string;
    component_id?: string; // populated server-side from the manifest before emit
    why: string;
    category: string;
    install_command: string;
    defs_snippet: string;
  }>;
  walkthroughs?: Array<{
    slug: string;
    title: string;
    why: string;
    url: string;
  }>;
  assumptions: string[];
  shell_script?: string;
};

const ANSWER_TOOL = {
  name: "answer",
  description:
    "Return the ranked recommendations for the user's intent. Only call once you have fetched enough context (schemas, READMEs, walkthroughs) to write real defs.yaml snippets or cite real walkthroughs.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string",
        description:
          "One-to-two sentence direct answer to the user's question. Written like a Slack reply, not a spec — tells the user what they're getting and why.",
      },
      recommendations: {
        type: "array",
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            component_name: { type: "string", description: "Exact name from the catalog." },
            why: { type: "string", description: "One-sentence rationale for this pick." },
            category: { type: "string" },
            install_command: {
              type: "string",
              description:
                "Full `dagster-component add <id>` command, using the real `id:` slug shown in the catalog line for this component — not the display name, not `dg add defs`, which is a different (official-package) install path this site doesn't lead with.",
            },
            defs_snippet: {
              type: "string",
              description:
                "Pasteable defs.yaml snippet. Field names MUST match the schema you fetched.",
            },
          },
          required: ["component_name", "why", "category", "install_command", "defs_snippet"],
        },
      },
      walkthroughs: {
        type: "array",
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: "Walkthrough slug (from the walkthroughs index).",
            },
            title: { type: "string", description: "Human-friendly walkthrough title." },
            why: { type: "string", description: "Why this walkthrough matches the intent." },
            url: {
              type: "string",
              description:
                "Full URL to the walkthrough on the templates repo (raw.githubusercontent.com/.../examples/<slug>/README.md).",
            },
          },
          required: ["slug", "title", "why", "url"],
        },
        description:
          "End-to-end walkthroughs relevant to the intent. This is the PRIMARY answer when the user asks 'do you have an example of X' / 'show me a demo of Y' — recommendations become optional in that case.",
      },
      assumptions: {
        type: "array",
        items: { type: "string" },
        description:
          "Assumptions the agent made (schedule, vendor, auth, sync mode, alternative shapes).",
      },
      shell_script: {
        type: "string",
        description:
          "Full `uvx create-dagster ... && dg add ...` shell script. Only include if the user asked for a project scaffold.",
      },
    },
    required: ["summary", "assumptions"],
  },
};

// ── Handler ───────────────────────────────────────────────────────────
//
// Server-Sent Events (SSE) format — server emits progressive
// `data: {"type": "...", ...}\n\n` frames so the widget can show
// live status ("Reading Salesforce Ingestion schema", "Fetching
// walkthrough supabase_rag", ...) instead of a static spinner.
//
// Event types:
//   progress    { message: string }        — human-facing status line
//   answer      { ...ToolInput, meta: ... } — final structured answer
//   error       { message: string }        — fatal error
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not set on the server." });
    return;
  }

  let body: any = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "invalid JSON body" });
      return;
    }
  }
  const intent = (body?.intent || "").toString().trim();
  const includeShell = Boolean(body?.options?.include_shell_script);
  // Follow-up support: the client stores the full prior conversation
  // (opaque to it) and resends it verbatim on the next question, per the
  // standard "API is stateless, resend full history" pattern — there's no
  // server-side session store. See the branch below for how this is used.
  const priorConversation: Anthropic.MessageParam[] | null =
    Array.isArray(body?.conversation) && body.conversation.length > 0
      ? (body.conversation as Anthropic.MessageParam[])
      : null;
  if (!intent) {
    res.status(400).json({ error: "missing `intent` in body" });
    return;
  }
  if (intent.length > 2000) {
    res.status(400).json({ error: "intent too long (max 2000 chars)" });
    return;
  }

  // Switch to SSE mode. All subsequent writes are `data: {...}\n\n` frames.
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx-style buffering
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  const emit = (type: string, data: Record<string, unknown> = {}) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    emit("progress", { message: "Loading catalog…" });
    const manifest = await loadManifest();
    const componentsByName = new Map<string, ManifestComponent>();
    for (const c of manifest.components) {
      if (c.name) componentsByName.set(c.name, c);
    }

    const playbooks = matchPlaybooks(intent);
    const playbookBlock = playbooks.length
      ? `\nPLAYBOOK HINTS (matched patterns — weight these heavily):\n${playbooks
          .map((p) => `  [${p.name}] ${p.hint}`)
          .join("\n")}\n`
      : "";
    if (playbooks.length) {
      emit("progress", {
        message: `Matched playbook: ${playbooks.map((p) => p.name).join(", ")}`,
      });
    }

    const anthropic = new Anthropic({ apiKey });
    // Sonnet: catches multi-stage intents + reasons about which stages
    // collapse when a component has a `destination` field. Haiku was
    // faster but missed the multi-stage picks. Current-gen Sonnet (not the
    // older claude-sonnet-4-6) for its 1M-token context — needed now that
    // the full catalog + walkthroughs index can run well past 100k tokens.
    const model = process.env.DCC_AGENT_MODEL || "claude-sonnet-5-5";

    const followUpBlock = [
      `Intent: ${intent}`,
      "",
      includeShell
        ? "The user wants a full project scaffold — include a `shell_script` in your answer."
        : "The user wants a recommendation only — do not include a `shell_script`.",
      playbookBlock,
    ].join("\n");

    let messages: Anthropic.MessageParam[];

    if (priorConversation) {
      // Continuing a conversation — the client replayed the full prior
      // history verbatim (including the first turn's cache_control
      // breakpoint on the static catalog block), so it's still
      // cache-eligible. Just append the follow-up; no need to rebuild or
      // re-fetch the catalog/walkthroughs/skill content, which is already
      // baked into the replayed history.
      emit("progress", { message: "Continuing the conversation…" });
      messages = [...priorConversation, { role: "user", content: followUpBlock }];
    } else {
      // Fixed, intent-INDEPENDENT order (manifest order, every component) —
      // not scoreCatalog's intent-sorted ranking. The whole point of the
      // cache_control breakpoint below is that this block is byte-identical
      // across every request regardless of who's asking what; sorting it by
      // relevance to one specific intent would make every distinct query
      // write its own cache entry and defeat cross-request cache hits. (A
      // relevance SORT only ever mattered for deciding what got cut under
      // the old top-150 truncation — now that nothing is cut, the model sees
      // every component regardless of order.) scoreCatalog is still used
      // below for search_component_readmes's shortlist, which isn't part of
      // this cached block.
      const catalogComponents = manifest.components.filter((c) => c.name);
      const catalog = catalogComponents.map(compactLine).join("\n");
      emit("progress", {
        message: `Sending the full catalog (${catalogComponents.length} components, nothing filtered out)`,
      });

      emit("progress", { message: "Loading walkthroughs index…" });
      // Inline the walkthroughs index (~30k tokens). Non-fatal if it fails
      // to fetch — agent still works without it, just can't recommend
      // specific end-to-end demos.
      const walkthroughsIndex = await loadWalkthroughsIndex();
      const walkthroughsBlock = walkthroughsIndex
        ? `\nWALKTHROUGHS INDEX (live-validated end-to-end demos — cite by slug in fetch_walkthrough):\n\n${walkthroughsIndex}\n`
        : "";

      // Inline the dagster-community-components skill's SKILL.md (short —
      // hard rules + CLI quick reference + decision table). Its deeper
      // reference/*.md pages are fetched on demand via fetch_skill_reference
      // instead of inlined here, so this stays cheap.
      const skillMd = await loadSkillMd();
      const skillBlock = skillMd
        ? `\nDAGSTER-COMMUNITY-COMPONENTS SKILL (published reference for this exact registry — deeper topics available via fetch_skill_reference):\n\n${skillMd}\n`
        : "";

      // Everything below is identical across every request within the
      // manifest/walkthroughs cache window (5-30 min) — it doesn't depend on
      // `intent`. Gets its own cache_control breakpoint so the ~full-catalog
      // + walkthroughs text (the expensive part of this prompt) is read from
      // cache, not reprocessed, on every request that lands in that window —
      // not just repeat turns within one conversation.
      const staticCatalogBlock = [
        `Candidate DCC registry catalog (${catalogComponents.length} components — the FULL catalog; PREFER these when any of them fit):`,
        catalog,
        "",
        `OFFICIAL INTEGRATIONS (Dagster-maintained \`dagster-<vendor>\` packages — the fallback layer when no registry component in the candidate list fits. Also useful as building blocks that some registry components wrap):`,
        formatOfficialIntegrations(),
        walkthroughsBlock,
        skillBlock,
        "Remember: fetch_component_schema for every registry component you're about to include in defs_snippet. Use fetch_component_readme when the user asks HOW something works. Use fetch_walkthrough when they want an end-to-end example. Use fetch_skill_reference for CLI-usage questions, YAML-writing conventions, or registry-wide questions (categories, validation tiers). Only cite the official `dagster-<vendor>` package when no registry component in the candidate list fits — the registry layer is the default.",
      ].join("\n");

      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: staticCatalogBlock,
              cache_control: { type: "ephemeral" },
            },
            { type: "text", text: followUpBlock },
          ],
        },
      ];
    }

    // Multi-turn tool-use loop. Cap at 12 iterations — with 5 tools
    // now, agent may do several fetches + a search + an answer.
    const MAX_ITERATIONS = 12;
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let cacheWriteTokens = 0;
    let schemasFetched = 0;
    let readmesFetched = 0;
    let walkthroughsFetched = 0;
    let readmeSearches = 0;
    let skillRefsFetched = 0;
    let finalAnswer: ToolInput | null = null;

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      emit("progress", { message: iter === 0 ? "Asking Claude…" : "Thinking…" });
      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        // Explicit breakpoint caches tools + system together (tools render
        // first, so a breakpoint on the last system block covers both).
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        // Top-level automatic caching covers the growing tool-loop tail
        // (each turn's tool_result/assistant messages) on top of the
        // explicit breakpoints above and on the static catalog block —
        // the combination recommended for multi-turn agent loops.
        cache_control: { type: "ephemeral" },
        // Force a tool call every turn. With the default "auto", Claude is
        // free to respond in plain text instead — rare, but when it
        // happens the loop below has nothing to act on and has to bail
        // with a hard error ("Claude returned no tool_use"). "any" makes
        // that failure mode structurally impossible: every turn ends in
        // either a fetch tool or `answer(...)`, both of which the loop
        // already knows how to handle.
        tool_choice: { type: "any" },
        tools: [
          FETCH_SCHEMA_TOOL as any,
          FETCH_README_TOOL as any,
          FETCH_WALKTHROUGH_TOOL as any,
          SEARCH_READMES_TOOL as any,
          FETCH_SKILL_REFERENCE_TOOL as any,
          ANSWER_TOOL as any,
        ],
        messages,
      });
      inputTokens += response.usage.input_tokens;
      outputTokens += response.usage.output_tokens;
      cacheReadTokens += response.usage.cache_read_input_tokens ?? 0;
      cacheWriteTokens += response.usage.cache_creation_input_tokens ?? 0;

      const toolUseBlocks = response.content.filter((b: any) => b.type === "tool_use");
      if (toolUseBlocks.length === 0) {
        const text = response.content
          .filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("\n");
        emit("error", { message: `Claude returned no tool_use: ${text.slice(0, 500)}` });
        return res.end();
      }

      // Push the assistant turn (with any thinking + tool_use blocks) to history.
      messages.push({ role: "assistant", content: response.content });

      // Process every tool_use in this turn; assemble tool_result payloads.
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        const b = block as any;
        if (b.name === ANSWER_TOOL.name) {
          finalAnswer = b.input as ToolInput;
          // No tool_result needed — this is the terminal call.
        } else if (b.name === FETCH_SCHEMA_TOOL.name) {
          const requestedName = (b.input?.component_name || "").toString();
          emit("progress", { message: `Reading schema: ${requestedName}` });
          const component = componentsByName.get(requestedName);
          let content: unknown;
          if (!component) {
            content = {
              error: `no component named '${requestedName}' in the catalog.`,
            };
          } else {
            content = await loadComponentSchema(component);
          }
          schemasFetched += 1;
          toolResults.push({
            type: "tool_result",
            tool_use_id: b.id,
            content: JSON.stringify(content),
          });
        } else if (b.name === FETCH_README_TOOL.name) {
          const requestedName = (b.input?.component_name || "").toString();
          emit("progress", { message: `Reading README: ${requestedName}` });
          const component = componentsByName.get(requestedName);
          let content: string;
          if (!component) {
            content = `[error: no component named '${requestedName}' in the catalog]`;
          } else {
            content = await loadComponentReadme(component);
          }
          readmesFetched += 1;
          toolResults.push({
            type: "tool_result",
            tool_use_id: b.id,
            content,
          });
        } else if (b.name === FETCH_WALKTHROUGH_TOOL.name) {
          const slug = (b.input?.slug || "").toString();
          emit("progress", { message: `Fetching walkthrough: ${slug}` });
          const content = slug
            ? await loadWalkthrough(slug)
            : "[error: missing `slug` argument]";
          walkthroughsFetched += 1;
          toolResults.push({
            type: "tool_result",
            tool_use_id: b.id,
            content,
          });
        } else if (b.name === SEARCH_READMES_TOOL.name) {
          const query = (b.input?.query || "").toString();
          emit("progress", { message: `Searching READMEs: “${query}”` });
          let content: unknown;
          if (!query) {
            content = { error: "missing `query` argument" };
          } else {
            content = await searchComponentReadmes(manifest.components, query, 5);
          }
          readmeSearches += 1;
          toolResults.push({
            type: "tool_result",
            tool_use_id: b.id,
            content: JSON.stringify(content),
          });
        } else if (b.name === FETCH_SKILL_REFERENCE_TOOL.name) {
          const topic = (b.input?.topic || "").toString() as SkillReferenceTopic;
          emit("progress", { message: `Reading skill reference: ${topic}` });
          const content = SKILL_REFERENCE_TOPICS.includes(topic)
            ? await loadSkillReference(topic)
            : `[error: unknown topic '${topic}'. Valid topics: ${SKILL_REFERENCE_TOPICS.join(", ")}]`;
          skillRefsFetched += 1;
          toolResults.push({
            type: "tool_result",
            tool_use_id: b.id,
            content,
          });
        } else {
          toolResults.push({
            type: "tool_result",
            tool_use_id: b.id,
            content: JSON.stringify({ error: `unknown tool ${b.name}` }),
            is_error: true,
          });
        }
      }

      if (finalAnswer) break;

      // Feed tool_results back to Claude for the next turn.
      messages.push({ role: "user", content: toolResults });
    }

    if (!finalAnswer) {
      emit("error", {
        message: `agent exceeded ${MAX_ITERATIONS} iterations without calling answer(...)`,
      });
      return res.end();
    }

    // Resolve component_id (the manifest slug used by /c/:id URLs) for
    // each recommendation. Widget links to /c/<id>, not /c/<display-name>.
    // Falls back to last-path-segment if manifest doesn't include an
    // explicit id — same rule as src/lib/componentId.ts in the UI.
    const componentIdOf = (c: ManifestComponent | undefined): string => {
      if (!c) return "";
      if (c.id && c.id.trim()) return c.id.trim();
      const seg = c.path?.replace(/\/+$/, "").split("/").pop()?.trim();
      return seg ?? "";
    };
    if (finalAnswer.recommendations) {
      for (const rec of finalAnswer.recommendations) {
        const comp = componentsByName.get(rec.component_name);
        rec.component_id = componentIdOf(comp);
      }
    }

    // Build the replayable history for a follow-up question. `messages`
    // currently ends with the assistant turn that called `answer(...)` —
    // a dangling tool_use with no tool_result, which the API will reject
    // if a plain user turn follows it directly. Swap that last turn for a
    // clean text-only recap (summary + what got recommended) instead of
    // replaying the raw tool_use block; every earlier tool call in this
    // turn already has its matching tool_result, so only the last entry
    // needs this treatment.
    const recapParts = [
      finalAnswer.summary,
      finalAnswer.recommendations?.length
        ? `Recommended: ${finalAnswer.recommendations.map((r) => r.component_name).join(", ")}.`
        : null,
      finalAnswer.walkthroughs?.length
        ? `Walkthroughs cited: ${finalAnswer.walkthroughs.map((w) => w.slug).join(", ")}.`
        : null,
    ].filter(Boolean);
    const conversationForClient: Anthropic.MessageParam[] = [
      ...messages.slice(0, -1),
      { role: "assistant", content: recapParts.join(" ") || "(recommendation provided)" },
    ];

    emit("answer", {
      ...finalAnswer,
      conversation: conversationForClient,
      meta: {
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_read_tokens: cacheReadTokens,
        cache_write_tokens: cacheWriteTokens,
        manifest_total: manifest.components.length,
        playbooks_matched: playbooks.map((p) => p.name),
        schemas_fetched: schemasFetched,
        readmes_fetched: readmesFetched,
        walkthroughs_fetched: walkthroughsFetched,
        readme_searches: readmeSearches,
        skill_refs_fetched: skillRefsFetched,
      },
    });
    res.end();
  } catch (e: any) {
    console.error("dcc-agent error", e);
    // If we already switched to SSE headers, emit an error event; else
    // fall back to a JSON error (only happens on very early failures).
    try {
      emit("error", { message: e?.message || String(e) });
      res.end();
    } catch {
      res.status(500).json({ error: e?.message || String(e) });
    }
  }
}
