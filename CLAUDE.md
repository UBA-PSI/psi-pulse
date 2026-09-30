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
- Deploy auf die VM nur nach Freigabe durch DH, vorher Proxmox-Snapshot (Checkliste im Ops-Repo).
- Ausgerollt wird nur von `main`: Images mit `scripts/build-release.sh` bauen (bricht auf anderen Branches und bei
  uncommitteten Änderungen ab). Feature-Branches erst nach `main` mergen, dann bauen.
