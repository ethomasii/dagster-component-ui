/** Curated sub-groups within the `agentic` manifest tag, for `/agentic`'s grouped layout.
 *
 *  The `agentic` tag itself (manifest.json) is a flat, cross-cutting label — it says "this
 *  implements or supports an agent loop" but nothing about WHAT KIND. 57 components under one
 *  flat grid is its own clutter problem, so this file re-groups the same tagged set into
 *  named buckets for display purposes only. Purely a UI concern: it does not read or write
 *  manifest.json, and a component's membership here has no bearing on its `tags` array.
 *
 *  One exception: "Context & knowledge", "Context receipts & provenance", "LLM inference &
 *  evaluation", and "AI-powered extraction & transforms" intentionally list close siblings that
 *  are NOT manifest-tagged `agentic` — they build/serve the knowledge base an agent reads from,
 *  log/audit what it retrieved, provide the single-shot LLM calls agent/pipeline components are
 *  built from, or apply one LLM call to a row/document without a multi-step loop — not an agent
 *  loop itself, so tagging them `agentic` would misclassify them everywhere else that tag is
 *  read. AgenticIndex.tsx resolves every group's componentIds against the full catalog (not just
 *  the `agentic`-tagged subset) for this reason.
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
    id: "context-knowledge",
    label: "Context & knowledge",
    description:
      "The retrieval layer most agents here read from before they answer — build a governed knowledge base or graph from raw text, then expose it to an agent over MCP. Not agent loops themselves (so not manifest-tagged `agentic`), but the precursor the Agents and MCP tool servers below are built to call.",
    componentIds: [
      "context_engineering_pipeline", "knowledge_graph_builder",
      "knowledge_search_server", "hybrid_knowledge_search_server", "rag_pipeline",
      "rag_eval", "rag_grounding_check",
      "hybrid_knowledge_search_query", "knowledge_graph_search_query",
      "knowledge_graph_search_server", "knowledge_base_eval",
      "document_chunker", "text_chunker", "embeddings_generator", "text_embedding_asset",
      "vertex_ai_text_embeddings_asset", "voyage_embedding_batch", "reranker",
      "vector_store_writer", "vector_store_query", "vector_index_snapshot",
      "supabase_vector_search_asset",
    ],
  },
  {
    id: "context-receipts",
    label: "Context receipts & provenance",
    description:
      "What gets logged when an agent retrieves or answers — a closed feedback loop auditing retrievals, outcomes, and item priors, with an optional warehouse sync. Also not agent loops themselves (so not manifest-tagged `agentic`); the outcomes side of this loop, receipt_outcome_ingestion, lives under Approval & review below since it's where feedback re-enters a run.",
    componentIds: ["context_receipt_store", "context_receipt_bigquery_sync"],
  },
  {
    id: "llm-inference",
    label: "LLM inference & evaluation",
    description:
      "Single-shot and batch LLM calls, provider wrappers, structured-output/function-calling primitives, and LLM-as-judge evaluation — the foundational calls the Agents and Pipelines below are built from. Not agent loops themselves (so not manifest-tagged `agentic`).",
    componentIds: [
      "anthropic_llm", "anthropic_llm_batch", "bedrock_converse_asset", "gemini_llm",
      "gemini_image_generation", "groq_llm", "huggingface_chat_completion",
      "inference_cost_report", "inference_provider_ab_test", "instructor_extractor",
      "litellm_audio_transcription", "litellm_batch_completion", "litellm_embedding_batch",
      "litellm_function_calling", "litellm_image_generation", "litellm_inference_asset",
      "litellm_structured_output", "litellm_text_to_speech", "llm_chain_executor",
      "llm_evaluator", "llm_judge", "llm_output_parser", "llm_prompt_executor",
      "mammouth_llm", "mistral_llm", "model_provider", "openai_llm", "openai_llm_batch",
      "openrouter_llm", "perplexity_llm", "provider_ab_evaluator", "snowflake_cortex_asset",
      "dspy_program",
    ],
  },
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
      "llm_multi_path_router",
    ],
  },
  {
    id: "ai-extraction-transforms",
    label: "AI-powered extraction & transforms",
    description:
      "One LLM call wired into ETL — document/field extraction, classification, enrichment, and generation over a row or file, not a multi-step agent loop. Not manifest-tagged `agentic` for the same reason as LLM inference & evaluation above.",
    componentIds: [
      "bank_statement_extractor", "contract_extractor", "data_enricher",
      "data_remediation_asset", "document_section_splitter", "document_summarizer",
      "expense_report_extractor", "footnote_reference_linker", "gong_call_summary_asset",
      "image_captioner", "image_llm_extractor", "insurance_claim_extractor",
      "invoice_extractor", "job_posting_extractor", "legal_document_extractor",
      "medical_record_extractor", "notion_brief_page", "precision_match",
      "purchase_order_extractor", "receipt_extractor", "resume_extractor", "schema_fit",
      "scientific_paper_extractor", "shipping_label_extractor", "sql_generator",
      "structured_document_extractor", "synthetic_data", "synthetic_prompt_generator",
      "text_classifier", "vanta_evidence_upload", "video_scene_summarizer", "vision_model",
    ],
  },
  {
    id: "mcp-tool-servers",
    label: "MCP tool servers",
    description: "Tool servers built for an agent to call over MCP — Dagster introspection, GitHub/Linear/Notion/Stripe/Cloudflare/Atlassian, OpenAPI, Slack/Teams chat tools.",
    componentIds: [
      "dagster_api_check_tools", "dagster_discovery_tools", "dagster_evidence_tools",
      "dagster_instance_tools", "dagster_workflow_tools", "document_intelligence_tools",
      "github_pr_tools", "linear_ticket_tools", "hosted_mcp_server", "notion_mcp_server",
      "stripe_mcp_server", "cloudflare_mcp_server", "atlassian_mcp_server",
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
