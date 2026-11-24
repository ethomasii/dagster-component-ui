/** Curated sub-groups within the `agentic` manifest tag, for `/agentic`'s grouped layout.
 *
 *  The `agentic` tag itself (manifest.json) is a flat, cross-cutting label — it says "this
 *  implements or supports an agent loop" but nothing about WHAT KIND. 57 components under one
 *  flat grid is its own clutter problem, so this file re-groups the same tagged set into
 *  named buckets for display purposes only. Purely a UI concern: it does not read or write
 *  manifest.json, and a component's membership here has no bearing on its `tags` array.
 *
 *  Kept as a hardcoded const (same pattern as `clis.ts`/`skills.ts`) because group membership
 *  is a curation judgment call, not something derivable from manifest fields alone — an
 *  `other` catch-all below covers any `agentic`-tagged component not yet triaged into a named
 *  group, so a newly-tagged component is never silently dropped, just unsorted until someone
 *  updates this file.
 */

export type AgenticGroup = {
  id: string;
  label: string;
  description: string;
  componentIds: string[];
};

export const AGENTIC_GROUPS: AgenticGroup[] = [
  {
    id: "pipelines",
    label: "Pipelines",
    description: "Multi-step agentic workflows declared in one YAML — steps, routing, and tool-use loops as a Dagster asset graph.",
    componentIds: ["agentic_pipeline", "agentic_pipeline_authoring_tools"],
  },
  {
    id: "agents",
    label: "Agents",
    description: "Single-shot and multi-step LLM agents — MCP-aware tool-use loops, supervisor/planner patterns, and provider-specific wrappers.",
    componentIds: [
      "litellm_agent", "openai_agent", "anthropic_agent", "gemini_agent",
      "vercel_ai_gateway_agent", "snowflake_cortex_agent", "supervisor_agent",
      "iterative_supervisor_agent", "langgraph_agent", "catalog_agent",
      "planned_catalog_agent", "vanta_evidence_response_agent", "adaptive_research_brief",
    ],
  },
  {
    id: "mcp-tool-servers",
    label: "MCP tool servers",
    description: "Tool servers built for an agent to call over MCP — Dagster introspection, GitHub/Linear/Notion, OpenAPI, Slack/Teams chat tools.",
    componentIds: [
      "dagster_api_check_tools", "dagster_discovery_tools", "dagster_evidence_tools",
      "dagster_instance_tools", "dagster_workflow_tools", "document_intelligence_tools",
      "github_pr_tools", "linear_ticket_tools", "hosted_mcp_server", "notion_mcp_server",
      "openapi_tool_server", "report_tools_server", "slack_chat_tools", "teams_chat_tools",
      "mcp_tool_picker", "mcp_tool_call",
    ],
  },
  {
    id: "approval-review",
    label: "Approval & review",
    description: "Human-in-the-loop gates and the queues/sensors that feed them — approve/reject tokens, review queues, failure remediation.",
    componentIds: [
      "human_approval_gate", "slack_approval_gate", "teams_approval_gate",
      "email_approval_gate", "multi_approver_gate", "approval_audit_asset",
      "rejection_feedback_loop", "run_failure_remediation", "receipt_outcome_ingestion",
      "agent_review_queue", "agent_fixture_check",
    ],
  },
  {
    id: "memory-registry",
    label: "Memory & registry",
    description: "Agent memory stores and the agent-card registry (A2A-style discovery of hosted agents and their skills).",
    componentIds: ["agent_memory_store", "conversation_memory", "agent_card", "agent_card_workspace"],
  },
  {
    id: "chat-platform-wiring",
    label: "Chat platform wiring",
    description: "The Slack/Teams sensors and sinks that trigger an agent run from a chat message and post its reply back.",
    componentIds: [
      "slack_agent_request_sensor", "slack_run_request_sensor", "slack_reply",
      "teams_agent_request_sensor", "teams_run_request_sensor", "teams_reply",
      "failed_run_agent_sensor", "github_pull_request_agent_sensor", "slack_pr_approval_watcher",
    ],
  },
  {
    id: "skills-resources",
    label: "Skills & resources",
    description: "Registration mechanisms — publish a skill or MCP server once, reference it by key from any agent component.",
    componentIds: ["skill_resource", "mcp_server_resource"],
  },
];

/** Every id explicitly triaged into a group above — used to compute the "Other" catch-all. */
export const ALL_GROUPED_IDS = new Set(AGENTIC_GROUPS.flatMap((g) => g.componentIds));
