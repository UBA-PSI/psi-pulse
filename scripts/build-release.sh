#!/usr/bin/env bash
# Baut die Images für die VM (pulse-app:<T>, pulse-migrate:<T>). Ausgerollt wird nur von main:
# Das Skript bricht ab bei anderem Branch, uncommitteten Änderungen oder wenn main nicht auf GitHub liegt
# (AGPL: der Quelltext-Link der App muss auf den laufenden Stand zeigen).
# Deploy danach nach Runbook 02 im Ops-Repo.
set -euo pipefail
cd "$(dirname "$0")/.."

branch=$(git rev-parse --abbrev-ref HEAD)
[ "$branch" = main ] || { echo "Abbruch: Branch ist '$branch', ausgerollt wird nur von main." >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Abbruch: uncommittete Änderungen." >&2; git status --short >&2; exit 1; }
git fetch -q origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "Abbruch: main ist nicht gepusht (git push origin main)." >&2; exit 1; }

T=$(git rev-parse --short HEAD)
docker buildx build --platform linux/amd64 --target runtime -t "pulse-app:$T" --load .
docker buildx build --platform linux/amd64 --target migrate -t "pulse-migrate:$T" --load .
echo "Gebaut: pulse-app:$T pulse-migrate:$T (main)"
