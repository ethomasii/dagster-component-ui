#!/usr/bin/env python3
"""
Copy one component folder from dagster-component-templates into your Dagster project.

  python add_component.py COMPONENT_ID [--dest defs/components]

No third-party deps (Python 3.9+). Downloads the GitHub archive zip and extracts only
that component's path — easier than cloning the whole repo by hand.

Example:
  python add_component.py s3_to_database_asset --dest defs/components
"""

from __future__ import annotations

import argparse
import io
import json
import sys
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

DEFAULT_MANIFEST = (
    "https://raw.githubusercontent.com/eric-thomas-dagster/dagster-component-templates/"
    "main/manifest.json"
)


def parse_github_repo(url: str) -> tuple[str, str]:
    """Return (owner, repo_name) from https://github.com/owner/repo"""
    u = url.rstrip("/").replace(".git", "")
    if "github.com" not in u:
        raise ValueError(f"Not a GitHub URL: {url}")
    parts = u.split("github.com/")[-1].split("/")
    if len(parts) < 2:
        raise ValueError(f"Could not parse owner/repo from {url}")
    return parts[0], parts[1]


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("component_id", help="Manifest id, e.g. s3_to_database_asset")
    p.add_argument(
        "--dest",
        default="defs/components",
        help="Directory where <component_id>/ will be created (default: defs/components)",
    )
    p.add_argument(
        "--manifest",
        default=DEFAULT_MANIFEST,
        help="URL to manifest.json",
    )
    p.add_argument("--branch", default="main", help="Git branch (default: main)")
    args = p.parse_args()

    try:
        raw = urllib.request.urlopen(args.manifest, timeout=120).read()
    except urllib.error.URLError as e:
        print(f"Failed to fetch manifest: {e}", file=sys.stderr)
        return 1

    manifest = json.loads(raw.decode("utf-8"))
    comp = next(
        (c for c in manifest["components"] if c["id"] == args.component_id),
        None,
    )
    if not comp:
        print(f"Unknown component id: {args.component_id!r}", file=sys.stderr)
        return 1

    repo_url = manifest.get("repository", "")
    try:
        owner, repo = parse_github_repo(repo_url)
    except ValueError as e:
        print(e, file=sys.stderr)
        return 1

    subpath = comp["path"].strip("/")
    zip_url = f"https://github.com/{owner}/{repo}/archive/refs/heads/{args.branch}.zip"
    root_folder = f"{repo}-{args.branch}"
    prefix = f"{root_folder}/{subpath}/"

    print(f"Fetching archive… {zip_url}")
    try:
        data = urllib.request.urlopen(zip_url, timeout=300).read()
    except urllib.error.URLError as e:
        print(f"Failed to download: {e}", file=sys.stderr)
        return 1

    dest_root = Path(args.dest).resolve() / args.component_id
    dest_root.mkdir(parents=True, exist_ok=True)

    n = 0
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        for member in zf.namelist():
            if not member.startswith(prefix) or member.endswith("/"):
                continue
            rel = member[len(prefix) :]
            if not rel:
                continue
            target = dest_root.joinpath(*rel.split("/"))
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member) as src, open(target, "wb") as out:
                out.write(src.read())
            n += 1

    if n == 0:
        print(
            f"No files extracted — check branch/path. prefix was {prefix!r}",
            file=sys.stderr,
        )
        return 1

    print(f"Wrote {n} files to {dest_root}")
    req = comp.get("requirements_url")
    if req:
        print(f"Next: pip install -r {dest_root / 'requirements.txt'}")
    elif comp.get("dependencies", {}).get("pip"):
        print("Next: pip install the packages listed in the registry for this component.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
