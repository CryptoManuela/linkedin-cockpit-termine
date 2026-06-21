# LinkedIn Cockpit — Termine-Ticker

Quelle für den Termine-/Werbe-Ticker der LinkedIn-Cockpit-Erweiterung.

- Gepflegt wird **nur in Notion** (Datenbank „LinkedIn Cockpit – Termine-Ticker").
- Eine GitHub Action (`.github/workflows/sync.yml`) liest die Datenbank stündlich
  und schreibt `termine.json`.
- Die Erweiterung liest `termine.json` von der Roh-Adresse dieses Repos.

`termine.json` nicht von Hand bearbeiten — wird überschrieben.

Benötigtes Secret: `NOTION_API_KEY` (Repo → Settings → Secrets and variables → Actions).
