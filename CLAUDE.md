# CLAUDE.md

Code von Pulse (Nuxt 4, Prisma 7, eigene DB-Sitzungen, Postgres). Ursprünglich Bachelorarbeit von Florian Seida,
jetzt vom Lehrstuhl PSI gepflegt. Betrieb, Server-Zugang und Befundliste liegen im privaten Ops-Repo
`~/Repositories/psi-pulse-vm` (`git.psi.uni-bamberg.de/PSI-Admin/psi-pulse-vm`).

- Öffentlich auf GitHub `UBA-PSI/psi-pulse`. Commit-Messages und Doku sachlich, ohne Details zu Sicherheitslücken;
  die stehen im Ops-Repo. Florians alte GitLab-Historie ist nicht enthalten (sein Wunsch):
  ein Commit mit Florians Originalstand, ein Commit mit der Weiterentwicklung am Lehrstuhl.
- Lizenz: AGPL-3.0 (`LICENSE`). Die laufende, veränderte Version muss auf ihren Quelltext verlinken.
- Keine Produktivdaten lokal verwenden; für Tests eine leere DB mit Migrationen und Testnutzern.
- Befund-Kürzel (A0, O10, B2 …) beziehen sich auf `docs/findings.md` und `docs/a11y-microcopy.md` im Ops-Repo.
- Oberfläche wird zweisprachig (DE/EN). Neue Texte nicht hart kodieren.
- Lokal testen: `docker-compose.dev.yml` (leere DB, Mailpit; Anleitung im README) und `scripts/e2e-*.sh`.
- Build und Deploy, nur von `main` und nur nach Freigabe durch DH (Details: Runbook 02 im Ops-Repo):
  1. Feature-Branches nach `main` mergen, `git push origin main`.
  2. `scripts/build-release.sh`: baut `pulse-app:<hash>` und `pulse-migrate:<hash>` für amd64; bricht ab bei anderem
     Branch, uncommitteten Änderungen oder wenn `main` nicht auf GitHub liegt (AGPL-Quelltext-Link).
  3. Proxmox-Snapshot `pre-deploy-<hash>` (DH).
  4. `~/Repositories/psi-pulse-vm/scripts/deploy.sh -n` (prüft nur), dann `scripts/deploy.sh` (ohne Terminal, z. B. über
     `!`: `--snapshot-ok`). Das Skript macht Dump, Übertragung, Migration, Neustart, Live-Prüfung und Startseite.
     Rückweg: `scripts/deploy.sh --rollback <voriger Tag>`.
  Schreibende Befehle auf VM und bew startet DH selbst; Claude baut, testet und prüft mit `-n`.
