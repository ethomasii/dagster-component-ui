const CATEGORY_LABEL: Record<string, string> = {
  transformation: "Transformations",
  source: "Sources",
  sink: "Sinks",
  ingestion: "Ingestion",
  analytics: "Analytics",
  ai: "AI & ML",
  infrastructure: "Infrastructure",
  dbt: "dbt",   // brand — stays lowercase
  sensor: "Sensors",
  external: "External assets",
  observation: "Observations",
  check: "Asset checks",
  integration: "Integrations",
  resource: "Resources",
  io_manager: "I/O managers",
  jobs: "Jobs",
  decorator: "Decorators",
};

/**
 * Human-readable label for a category slug.
 *
 * Priority:
 *   1. Explicit label from CATEGORY_LABEL (respects brand casing like "dbt"
 *      and initialisms like "AI & ML").
 *   2. Fallback: replace underscores with spaces and capitalize the first
 *      letter. Keeps new/unknown categories readable without a code change.
 */
export function categoryLabel(cat: string): string {
  const explicit = CATEGORY_LABEL[cat];
  if (explicit) return explicit;
  const spaced = cat.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * One-paragraph blurb for a category slug — shown at the top of
 * `/categories/:slug` so the page reads as substantive rather than
 * "a filtered component grid". Kept short (1-3 sentences) so it
 * doesn't push the component grid below the fold.
 */
const CATEGORY_DESCRIPTION: Record<string, string> = {
  ai: "Components for AI, ML, and agentic workloads — single-shot LLM agents with MCP tool use, multi-step agentic pipelines (16 ops covering llm_call, route, debate, critique_loop, map, extract, classify, tool_use_loop, and more), RAG pipelines, LLM-as-judge evaluators, and warehouse-native inference via Snowflake Cortex.",
  analytics: "Multi-step analytical pipelines declared in one YAML — ML pipelines (feature engineering → split → train → evaluate → Model Registry), forecasting, causal inference, cohort and funnel analysis. Every step becomes a first-class Dagster asset.",
  check: "Asset checks — data-quality validators (Great Expectations, Soda, dbt tests, custom SQL), MLflow model version gates, and freshness/schema-drift detectors that run alongside your assets and gate downstream materializations.",
  dbt: "Companion components that extend the official dagster-dbt integration — enriched project loaders, docs-aware wrappers, and state-reuse patches. Reach for these when dagster-dbt itself isn't enough.",
  decorator: "Reusable @decorator-shaped augmentations for existing assets — timeout wrappers, log capture, hook injection, throttling, dry-run shims, shadow mode, sensitive-data redaction, snapshots, partition locks, and budget guards. Drop one on any asset function to add cross-cutting behavior without rewriting it.",
  external: "Declare-only external assets — pure lineage nodes for tables, topics, and datasets that Dagster doesn't materialize but should appear in the graph. One per vendor (external_snowflake_table, external_bigquery_dataset, external_kafka_topic, external_s3_object, …).",
  infrastructure: "Assets that run something outside Dagster's compute — Docker containers, external batch jobs, cloud-run workflows, mainframe submits, Ab Initio graphs. Dagster owns the schedule and lineage; the actual work runs elsewhere.",
  ingestion: "Get data INTO your warehouse or lake — bulk load helpers, DB-to-DB replication, Kafka / Kinesis / Pub/Sub landers, API-to-database, S3 / GCS / ADLS-to-database, CDC consumers, and file-format-specific loaders (CSV, Parquet, JSON, XML, Avro).",
  integration: "Vendor and platform integrations — workspace-shaped bulk importers (snowflake_workspace, mlflow_workspace, notion, github, jira, stripe, …) plus per-object components for finer control. Turn an external system into a Dagster catalog with one YAML.",
  io_manager: "Asset I/O managers — where a DataFrame lands between assets. Local + cloud Parquet (S3 / GCS / ADLS), warehouse-backed IO (Snowflake / BigQuery / Databricks), lakehouse formats (Delta, Iceberg), and multiprocess-safe local backends.",
  jobs: "Op-shaped jobs (no assets) — one-shot operations that don't fit the asset model: cleanup and prune, warehouse migrations, event log exports, cross-system triggers (Cognos reports, Qlik replicate tasks, TM1 processes), config-driven partition launchers. Runnable on demand or on a schedule.",
  observation: "Sensors that poll external systems and emit AssetObservation or AssetMaterialization events without triggering runs — filesystem watchers, Kafka topic observers, DB table observers, cloud-log queriers. Metadata surfaces in Dagster+; downstream automation fires on data-version change.",
  resource: "Connection-handle wrappers (@resource) — the foundational database, API, and service connections that every other component depends on. Snowflake, Postgres, MongoDB, Redis, S3, GCS, Kafka, PagerDuty, Slack, LiteLLM, MLflow, and dozens more.",
  sensor: "Event-driven triggers — file arrivals, webhook payloads, DB polls, external job completions (Airbyte, dbt Cloud, Fivetran, MLflow), and scheduled event scans. Sensors emit RunRequests when something interesting happens.",
  sink: "Ship computed data OUT — write DataFrames to files (CSV / Parquet / Avro / JSON / Excel), warehouses (Snowflake / BigQuery / Databricks), lakehouses (Iceberg / Delta), object stores (S3 / GCS / ADLS), messaging (Kafka / Redis / Pub/Sub), external catalogs (DataHub / OpenMetadata / Purview / Alation / Collibra), and observability backends (Prometheus / StatsD / Datadog / OTel).",
  source: "Read data INTO a pipeline as a DataFrame or dictionary — REST APIs, OData feeds (SAP / MS Graph / Dynamics), warehouse queries, MCP tool calls, synthetic data generators. Sources produce the DataFrame that transforms consume.",
  transformation: "Reshape data — filter, summarize, join, dedup, pivot, unpivot, window functions, top-N per group, period-over-period change, type coercion, and DataFrame utilities. Plus multi-step pipeline components (snowpark_pipeline, polars_pipeline, pyspark_pipeline, warehouse_pipeline) that chain many ops into one asset for whole-plan pushdown.",
};

/**
 * Blurb for the top of a category landing page. Falls back to a
 * generic string when the slug isn't in the map (fine — the page
 * still works, and adding a new category is a one-line map update).
 */
export function categoryDescription(cat: string): string {
  return (
    CATEGORY_DESCRIPTION[cat] ??
    `All community-registry components with category: ${cat}.`
  );
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso + "T12:00:00Z").toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Accepts calendar dates or full ISO strings (e.g. verification checked_at). */
export function formatIsoDate(iso: string): string {
  try {
    const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
