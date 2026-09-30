#!/bin/bash
set -euo pipefail

# Startseite von Pulse bauen und nach bew kopieren. Caddy liefert sie dort unter
# pulse.psi.uni-bamberg.de/ (DE), /barrierefreiheit/, /entwickler/, /en/ und /assets/ aus; alles andere geht an die App-VM
# (Eintrag pulse.psi.uni-bamberg.de in psi-ansible, inventory/group_vars/bew.yml).
#
#   landing/deploy.sh      # bauen + syncen
#   landing/deploy.sh -n   # dry-run: bauen, nur anzeigen, was rsync übertragen würde

REMOTE="root@bew"
DOCROOT="/var/www/pulse.psi.uni-bamberg.de"

cd "$(dirname "$0")"
python3 build.py

# Schutz vor rsync --delete mit unvollständigem Build
for f in dist/index.html dist/en/index.html dist/barrierefreiheit/index.html dist/en/accessibility/index.html \
         dist/entwickler/index.html dist/en/developers/index.html dist/assets/pulse-landing.css; do
    [[ -f "$f" ]] || { echo "ERROR: $f fehlt im Build."; exit 1; }
done

# Keine Platzhalter veröffentlichen (z. B. Datum der Erklärung zur Barrierefreiheit)
if grep -rl '\[\[OFFEN:' dist --include='*.html'; then
    echo "ERROR: offene Platzhalter [[OFFEN: …]] in den Seiten oben (Texte in landing/src/*.toml)."; exit 1
fi

RSYNC_OPTS=(-avz --checksum --delete --exclude='.DS_Store')
if [[ "${1:-}" == "-n" ]]; then
    rsync "${RSYNC_OPTS[@]}" --dry-run dist/ "$REMOTE:$DOCROOT/"
    exit 0
fi
rsync "${RSYNC_OPTS[@]}" dist/ "$REMOTE:$DOCROOT/"
# rsync -a übernimmt sonst die lokale UID
ssh "$REMOTE" "chown -R caddy:caddy $DOCROOT"
echo "OK: https://pulse.psi.uni-bamberg.de/, /en/, /barrierefreiheit/, /en/accessibility/, /entwickler/ und /en/developers/"
