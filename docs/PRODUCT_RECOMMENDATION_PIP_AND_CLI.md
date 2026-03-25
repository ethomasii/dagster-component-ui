# Recommendation: pip install & CLI for community Dagster components

**Audience:** Product / engineering  
**Context:** The [dagster-component-templates](https://github.com/eric-thomas-dagster/dagster-component-templates) library (and this registry UI) today rely on **copying source from GitHub** or small helpers (`npx tiged`, `add_component.py`). That works but is higher friction than ecosystems like **Apache Airflow**, where users run `pip install apache-airflow-providers-<name>==<version>` and get versioned, discoverable packages.

**Goal:** Make it **easy for practitioners** to add a template to a Dagster project—ideally one command—while keeping expectations clear that offerings are **community-supported**, not first-party Dagster Labs releases unless you later promote them.

---

## Why invest

| Today | Desired |
|--------|---------|
| Clone/copy paths, manual `requirements.txt` | `pip install …` or `dgt add <id>` with pinned deps |
| Hard to script in CI / golden images | Versioned artifacts on PyPI or a signed CLI |
| Parity gap vs Airflow registry UX | Closer mental model to “install provider” |

This does **not** require Dagster core to own every template; it requires a **distribution and packaging** strategy for the community catalog.

---

## Option A — PyPI package (closest to Airflow)

**Idea:** Publish one or more **installable Python packages** whose contents are the template folders (or generated stubs that unpack assets).

**Patterns:**

1. **Monorepo meta-package**  
   - Single package `dagster-community-component-templates` (name TBD) with **optional extras** per integration, e.g.  
     `pip install dagster-community-component-templates[s3, snowflake]`  
   - Extras map to dependency groups in `pyproject.toml`; each extra could install only the files + deps for that slice (complex build).

2. **Namespace / split packages**  
   - `dagster-community-ingestion`, `dagster-community-ai`, etc., each versioned and published from the same repo via CI (similar to many provider ecosystems).

3. **Minimal “loader” package**  
   - Thin package on PyPI that **only** contains a CLI (see Option B) and **declares no component code**; first run downloads from GitHub or a release artifact. Lower maintenance, weaker offline story.

**Pros:** Familiar `pip install`, lockfiles, Dependabot, semver.  
**Cons:** Build/release pipeline, naming/branding (“community” vs “official”), keeping PyPI in sync with GitHub.

**Recommendation:** If the community wants **maximum adoption** and **parity with Airflow’s mental model**, invest in **Option A** over time, starting with a **single versioned meta-package** and a small set of extras—not 200 packages on day one.

---

## Option B — CLI first (`pip install` only the tool)

**Idea:** One small package, e.g. `dagster-component-catalog` or `dgt-community-cli`, installable via:

```bash
pip install dagster-component-catalog
dgt-component add s3_to_database_asset --dest defs/components
```

**Behavior:**

- Read **manifest.json** (from pinned release URL or GitHub tag).
- Download the same zip / path logic as `tools/add_component.py` today.
- Optional: `dgt-component list`, `dgt-component search`, `dgt-component doctor`.

**Pros:** Fast to ship; **one** package to version; no need to repackage every template as Python modules initially. Aligns with “get all these” via `list` / batch flags later.

**Cons:** Not a “import the package in code” story—still file-based templates (which is fine for Dagster Components).

**Recommendation:** **Ship Option B early** as the lowest-risk improvement. It gives a **single `pip install`** story for *the tooling*, even before full template packages exist.

---

## Option C — Official-adjacent path (coordination)

If **Dagster Labs** or **Elementl** ever wants a blessed “community index”:

- List the CLI or meta-package in docs under **Community** or **Ecosystem**.
- Clear **support boundary**: community templates vs core `dagster` / `dagster-components`.

No code change required here—mostly positioning and maybe a link from [docs.dagster.io](https://docs.dagster.io).

---

## Suggested phased plan

| Phase | Deliverable | Outcome |
|-------|-------------|---------|
| **1** | PyPI package wrapping **`add_component.py`** + manifest fetch + `add`, `list`, `search` | Users: `pip install …` then one CLI command |
| **2** | Pin releases to **Git tags** / checksums; document versioning policy | Trust + reproducibility |
| **3** | Evaluate **meta-package with extras** for top N templates | True `pip install` of template *artifacts* where it pays off |
| **4** | Optional **batch**: `dgt-component add-all --category ingestion` for “get everything in a category” (with guardrails) | Power users / platform teams |

---

## Risks to call out

- **Support:** Community templates should stay clearly labeled; avoid implying Dagster Labs support unless you adopt them.
- **Security:** Any CLI that downloads from GitHub should pin **tags/commits** and verify checksums for production use.
- **Version skew:** Manifest + schema versions should align with published CLI/package versions (single source of truth in CI).

---

## Summary

- **Short term:** **Option B (CLI on PyPI)** — biggest ease-of-use win for least packaging surface.
- **Medium term:** **Option A (extras or split packages)** if demand for “install like Airflow” stays high.
- **Positioning:** Market as **community-supported**; keep naming and docs honest.

This registry site can later link to the published CLI/package once it exists.
