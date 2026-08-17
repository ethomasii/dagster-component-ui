/**
 * Canonical URL bases for the community CLI repo
 * (dagster-community-components-cli). Both the walkthrough examples
 * and the blog live in this repo — everything else in the UI derives
 * from these two roots.
 *
 * Change branch / owner / repo here once and everything downstream
 * (examples, blog, RSS feed, setup-script curls) picks it up.
 */

const OWNER = "eric-thomas-dagster";
const REPO = "dagster-community-components-cli";
const BRANCH = "main";

/** raw.githubusercontent — for fetching file contents into the app. */
export const COMMUNITY_CLI_RAW_BASE =
  `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`;

/** github.com — for human-friendly "read on GitHub" links. */
export const COMMUNITY_CLI_WEB_BASE = `https://github.com/${OWNER}/${REPO}`;

/** github.com tree URL — for browsing a folder on GitHub. */
export const COMMUNITY_CLI_TREE_BASE = `${COMMUNITY_CLI_WEB_BASE}/tree/${BRANCH}`;
