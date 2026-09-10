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
// Send the LLM a name + description + category + tags + key agent_hints
// per component. Full manifest is 2 MB / 991 components; compact form is
// ~50k tokens and fits in one Claude call.
function compactCatalog(m: Manifest): string {
  const lines = m.components
    .filter((c) => c.name)
    .map((c) => {
      const hints = c.agent_hints || {};
      const io =
        hints.input_type || hints.output_type
          ? ` [io: ${hints.input_type ?? "?"} → ${hints.output_type ?? "?"}]`
          : "";
      const tags = (c.tags || []).slice(0, 6).join(",");
      return `${c.name} (${c.category})${io} — ${c.description}${tags ? ` #${tags}` : ""}`;
    });
  return lines.join("\n");
}

// ── Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the DCC Agent — an assistant that recommends Dagster Community Components (DCC) for a user's data-engineering intent.

You have the full DCC catalog (component name, category, one-line description, tags, and IO type hints). Pick the components that best solve the user's intent, favoring:
  1. Components whose description directly matches the intent
  2. Native single-provider components over generic multiplexers when the vendor is named
  3. Combining components into a pipeline when the intent spans multiple stages (ingest → transform → sink)

Do NOT invent component names. Only recommend components that exist in the catalog you were given.

Do NOT recommend more than 5 components — pick the smallest set that solves the intent. If the intent needs one component, return one.

For each recommendation, produce a defs.yaml snippet using realistic field values as placeholders (e.g. \${VAR_NAME}). The snippet should be pasteable into a scaffolded project's defs/ directory.

If the user asks for a full project scaffold (include_shell_script=true), also produce a shell script that scaffolds a fresh Dagster project and adds all recommended components:
  uvx create-dagster project my_project --uv-sync
  cd my_project
  dg add defs <component_name>/<component_name>.yaml
  ...

State any assumptions you made (schedule cadence, target vendor, auth method) so the user can correct you.`;

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
    const catalog = compactCatalog(manifest);

    const anthropic = new Anthropic({ apiKey });
    const model = process.env.DCC_AGENT_MODEL || "claude-sonnet-4-6";

    const userText = [
      `Intent: ${intent}`,
      "",
      includeShell
        ? "The user wants a full project scaffold — include a `shell_script` in your answer."
        : "The user wants a recommendation only — do not include a `shell_script`.",
      "",
      `DCC catalog (${manifest.components.length} components — pick from these ONLY):`,
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
      },
    });
  } catch (e: any) {
    console.error("dcc-agent error", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
}
