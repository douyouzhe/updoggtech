#!/usr/bin/env bash
# Publish the current working tree to Cloudflare Pages (sdeoffer.com / project "sdeoffer").
#
# Why this exists: `git push` only updates the GitHub source repo. The live site is NOT
# auto-deployed from GitHub — it must be deployed manually with Wrangler. Run this after
# pushing (or any time) to publish the current files. Typical flow:
#
#     git add -A && git commit -m "…" && git push origin main && ./deploy.sh
#
# Requires: wrangler logged in (`npx wrangler whoami` should show your Cloudflare account).
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

# Copy the site, EXCLUDING .git (its config holds a plaintext GitHub PAT — never publish it),
# local caches/state, and any shell scripts (a static site should never serve them).
rsync -a \
  --exclude='.git' \
  --exclude='.DS_Store' \
  --exclude='.wrangler' \
  --exclude='node_modules' \
  --exclude='*.sh' \
  ./ "$STAGE"/

# Hard safety gate: never deploy if .git slipped through (would leak the PAT publicly).
if [ -e "$STAGE/.git" ]; then
  echo "✗ .git present in staging dir — aborting to avoid leaking credentials." >&2
  exit 1
fi

pages=$(find "$STAGE" -name index.html | wc -l | tr -d ' ')
echo "→ Publishing ${pages} pages to Cloudflare Pages (project: sdeoffer)…"
npx --yes wrangler pages deploy "$STAGE" \
  --project-name=sdeoffer \
  --branch=main \
  --commit-dirty=true
