/** Canonical URLs for examples in dagster-community-components-cli (manifest lives in-repo). */

import {
  COMMUNITY_CLI_RAW_BASE,
  COMMUNITY_CLI_TREE_BASE,
} from "./communityCliRepo";

export const COMMUNITY_CLI_EXAMPLES_RAW_BASE = `${COMMUNITY_CLI_RAW_BASE}/examples`;

/** Index for the demos folder — table of demos, how to run scripts, rationale. */
export const COMMUNITY_CLI_EXAMPLES_INDEX_README_URL = `${COMMUNITY_CLI_EXAMPLES_RAW_BASE}/README.md`;

/** Human-friendly browse URL (folder on GitHub). */
export const COMMUNITY_CLI_EXAMPLES_TREE_WEB = `${COMMUNITY_CLI_TREE_BASE}/examples`;

export function exampleSetupScriptCurl(slug: string): string {
  return `curl -fsSL ${COMMUNITY_CLI_EXAMPLES_RAW_BASE}/setup_${slug}_demo.sh | bash`;
}
