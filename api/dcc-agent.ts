/**
 * DCC Agent — Vercel serverless endpoint.
 *
 * POST /api/dcc-agent
 * Body: { intent: string, options?: { include_shell_script?: boolean } }
 *
 * Loads the DCC manifest from GitHub raw (cached in-module for 5 min),
 * asks Claude to recommend components matching the user's intent, and
 * returns a structured JSON response with install commands + defs.yaml
 * snippets.
 *
 * Env vars:
 *   ANTHROPIC_API_KEY   — required, server-side only
 *   DCC_AGENT_MODEL     — optional override, defaults to claude-sonnet-4-6
 */
import Anthropic from "@anthropic-ai/sdk";

// ── Manifest cache ────────────────────────────────────────────────────
const MANIFEST_URL =
  "https://raw.githubusercontent.com/eric-thomas-dagster/dagster-component-templates/main/manifest.json";
const CACHE_TTL_MS = 5 * 60 * 1000;

type ManifestComponent = {
  name?: string;
  category?: string;
  description?: string;
  tags?: string[];
  keywords?: string[];
  vendor?: string;
  vendors?: string[];
  agent_hints?: Record<string, unknown>;
  produces?: string[];
  readme_url?: string;
  example_url?: string;
};
type Manifest = { version: string; total?: number; components: ManifestComponent[] };

let cachedManifest: { at: number; data: Manifest } | null = null;

async function loadManifest(): Promise<Manifest> {
  const now = Date.now();
  if (cachedManifest && now - cachedManifest.at < CACHE_TTL_MS) {
    return cachedManifest.data;
  }
  const r = await fetch(MANIFEST_URL);
  if (!r.ok) throw new Error(`manifest fetch failed: HTTP ${r.status}`);
  const data = (await r.json()) as Manifest;
  cachedManifest = { at: now, data };
  return data;
}

// ── Compact catalog for the LLM prompt ────────────────────────────────
//
// Per component: name + category + vendor + tags/keywords + IO type +
// description. ~200 bytes each × 991 components = ~50k tokens. We
// pre-filter to top-K candidates below to shave that to ~8k tokens and
// give the LLM headroom for careful ranking.
function compactLine(c: ManifestComponent): string {
  const hints = c.agent_hints || {};
  const io =
    hints.input_type || hints.output_type
      ? ` [io: ${hints.input_type ?? "?"} → ${hints.output_type ?? "?"}]`
      : "";
  const vendor = c.vendor ? ` v:${c.vendor}` : "";
  // Combine tags + keywords into a single deduped short list — both drive
  // vendor / capability recognition and one signal isn't enough.
  const tagSet = new Set<string>();
  (c.tags || []).forEach((t) => tagSet.add(t));
  (c.keywords || []).forEach((t) => tagSet.add(t));
  const tags = Array.from(tagSet).slice(0, 10).join(",");
  return `${c.name} (${c.category})${vendor}${io} — ${c.description}${tags ? ` #${tags}` : ""}`;
}

// ── Server-side pre-filter (keyword ranking) ──────────────────────────
//
// Rank every catalog component against the user's intent using a simple
// TF-style keyword match on name/description/tags/keywords/vendor. Send
// only the top-K to the LLM — cuts input tokens ~7x, cuts latency, and
// keeps the LLM focused on plausible candidates instead of the full
// 991-component space.
//
// The keyword extractor keeps proper nouns (Salesforce, BigQuery) and
// technology words verbatim, plus common lowercased tokens. Stopwords
// dropped.
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

function scoreCatalog(
  components: ManifestComponent[],
  intent: string,
  topK: number,
): ManifestComponent[] {
  const intentTokens = tokenize(intent);
  if (intentTokens.length === 0) return components.slice(0, topK);
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
        // Weighted match: name matches count 4x, tags/keywords/vendor 3x,
        // description 1x. Encourages picking components whose primary
        // vendor / capability is IN the intent's noun set.
        if (nameToks.includes(t)) score += 4;
        if (tagToks.includes(t)) score += 3;
        if (descToks.includes(t)) score += 1;
      }
      // Small boost for tag/keyword coverage breadth
      const tagsHit = tagToks.filter((t) => intentSet.has(t)).length;
      score += Math.min(tagsHit, 3);
      return { c, score };
    });

  scored.sort((a, b) => b.score - a.score);
  // Always return at least topK; if fewer than topK have any score, pad
  // with the highest-signal remaining (already sorted) so the LLM still
  // sees breadth for creative combos.
  return scored.slice(0, topK).map((x) => x.c);
}

// ── Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the DCC Agent — you recommend Dagster Community Components (DCC) for a user's data-engineering intent.

You will be given a pre-filtered candidate catalog (each line: name, category, vendor, IO types, description, tags/keywords). Every entry in the catalog was surfaced because it keyword-matches the user's intent, so all candidates are potentially relevant.

**Picking rules — apply in order:**

1. **Match every stage of the intent.** If the intent spans multiple stages, pick one component per stage. For example, "sync X to Y every N hours with schema validation" needs (a) an X ingestion source, (b) a Y sink or IO manager, (c) a schema-validation asset check, (d) a schedule to trigger it. Don't return a schema-validation check alone if the ingest + sink components exist in the candidates.

2. **Prefer native single-vendor components over generic multiplexers** when the intent names a specific vendor (Salesforce, BigQuery, Snowflake, dbt, etc.). Match component names/vendor fields to the vendors named in the intent.

3. **Prefer specific over general.** A component named after the exact vendor beats a generic one that could serve many vendors.

4. **Return the smallest set that solves the full intent.** Never more than 5 components. If one component covers the whole thing, return one. If the intent needs ingest+transform+sink+check, return four.

5. **Do NOT invent component names.** Only pick from the candidate catalog you're given.

For each recommendation, produce a defs.yaml snippet using realistic placeholder values (\${VAR_NAME} form for secrets). The snippet must be pasteable into a scaffolded project's defs/ directory.

If include_shell_script is set, produce a shell script that:
  uvx create-dagster project my_project --uv-sync
  cd my_project
  dg add defs <component_name>/<component_name>.yaml
  ...
for every recommended component.

Always state assumptions (schedule cadence, target vendor, auth method) so the user can correct you.`;

type ToolInput = {
  recommendations: Array<{
    component_name: string;
    why: string;
    category: string;
    install_command: string;
    defs_snippet: string;
  }>;
  assumptions: string[];
  shell_script?: string;
};

const RESPONSE_TOOL = {
  name: "answer",
  description: "Return the ranked component recommendations for the user's intent.",
  input_schema: {
    type: "object" as const,
    properties: {
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
              description: "Full `dg add defs <name>/<name>.yaml` command.",
            },
            defs_snippet: {
              type: "string",
              description: "Pasteable defs.yaml snippet with placeholders.",
            },
          },
          required: ["component_name", "why", "category", "install_command", "defs_snippet"],
        },
      },
      assumptions: {
        type: "array",
        items: { type: "string" },
        description: "Assumptions the agent made when picking components (schedule, vendor, auth, etc).",
      },
      shell_script: {
        type: "string",
        description:
          "Full `uvx create-dagster ... && dg add ...` shell script. Only include if the user asked for a project scaffold.",
      },
    },
    required: ["recommendations", "assumptions"],
  },
};

// ── Handler ───────────────────────────────────────────────────────────
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
  if (!intent) {
    res.status(400).json({ error: "missing `intent` in body" });
    return;
  }
  if (intent.length > 2000) {
    res.status(400).json({ error: "intent too long (max 2000 chars)" });
    return;
  }

  try {
    const manifest = await loadManifest();
    const candidates = scoreCatalog(manifest.components, intent, 150);
    const catalog = candidates.map(compactLine).join("\n");

    const anthropic = new Anthropic({ apiKey });
    // Haiku is fast, cheap, and plenty smart for a ranked-pick task over
    // a pre-filtered candidate list. Overridable via env for A/B.
    const model = process.env.DCC_AGENT_MODEL || "claude-haiku-4-5";

    const userText = [
      `Intent: ${intent}`,
      "",
      includeShell
        ? "The user wants a full project scaffold — include a `shell_script` in your answer."
        : "The user wants a recommendation only — do not include a `shell_script`.",
      "",
      `Candidate DCC catalog (${candidates.length} of ${manifest.components.length} components, pre-filtered by keyword match — pick from these ONLY):`,
      catalog,
    ].join("\n");

    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [RESPONSE_TOOL as any],
      tool_choice: { type: "tool", name: RESPONSE_TOOL.name },
      messages: [{ role: "user", content: userText }],
    });

    const toolBlock = response.content.find((b: any) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      res.status(502).json({
        error: "Claude did not return a tool_use response",
        raw: response.content,
      });
      return;
    }
    const answer = (toolBlock as any).input as ToolInput;

    res.status(200).json({
      ...answer,
      meta: {
        model,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        manifest_total: manifest.components.length,
        candidates_sent: candidates.length,
      },
    });
  } catch (e: any) {
    console.error("dcc-agent error", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
}
