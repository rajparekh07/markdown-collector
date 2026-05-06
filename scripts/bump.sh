#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: ./scripts/bump.sh patch|minor|major" >&2
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

part="$1"
case "$part" in
  patch|minor|major) ;;
  *)
    usage
    exit 1
    ;;
esac

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

new_version="$(
  node - "$part" <<'NODE'
const fs = require("fs");

const part = process.argv[2];
const manifestPath = "manifest.json";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const match = String(manifest.version || "").match(/^(\d+)\.(\d+)\.(\d+)$/);

if (!match) {
  throw new Error(`manifest.json version must be semver major.minor.patch, got "${manifest.version}"`);
}

let [, major, minor, patch] = match.map(Number);
if (part === "major") {
  major += 1;
  minor = 0;
  patch = 0;
} else if (part === "minor") {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}

manifest.version = `${major}.${minor}.${patch}`;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(manifest.version);
NODE
)"

git add manifest.json
git commit -m "Bump version to ${new_version}"
git tag "v${new_version}"

echo "Bumped manifest.json to ${new_version} and created tag v${new_version}."
