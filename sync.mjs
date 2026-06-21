// Liest die Notion-Datenbank "LinkedIn Cockpit – Termine-Ticker" und schreibt
// termine.json. Läuft als GitHub Action (stündlich) und lokal mit denselben Env-Vars.
// Env: NOTION_API_KEY (Pflicht), NOTION_TERMINE_DB (optional, Default unten).
import { writeFileSync } from "node:fs";

const NOTION_KEY = process.env.NOTION_API_KEY;
const DB = process.env.NOTION_TERMINE_DB || "bae3dd9112484b05bacec8d66389cbac";
const CTA = { label: "Alle Programme", url: "https://manuela-ruppert.de/ki-coaching" };

if (!NOTION_KEY) { console.error("NOTION_API_KEY fehlt"); process.exit(1); }

const res = await fetch(`https://api.notion.com/v1/databases/${DB}/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${NOTION_KEY}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    filter: { property: "Aktiv", checkbox: { equals: true } },
    sorts: [{ property: "Reihenfolge", direction: "ascending" }],
  }),
});
if (!res.ok) { console.error("Notion " + res.status + ": " + (await res.text()).slice(0, 300)); process.exit(1); }

const data = await res.json();
const termine = data.results
  .map((p) => {
    const pr = p.properties || {};
    const titel = (pr.Titel?.title || []).map((t) => t.plain_text).join("").trim();
    // "Zeitpunkt" ist freier Text: ISO-Datum (im Ticker formatiert) oder Phrase.
    const datum = (pr.Zeitpunkt?.rich_text || []).map((t) => t.plain_text).join("").trim();
    const url = pr.Link?.url || "";
    return url ? { datum, titel, url } : { datum, titel };
  })
  .filter((t) => t.titel && t.datum);

const payload = { updated: new Date().toISOString().slice(0, 10), cta: CTA, termine };
writeFileSync("termine.json", JSON.stringify(payload, null, 2) + "\n");
console.log(`OK: ${termine.length} aktive Termine geschrieben.`);
for (const t of termine) console.log("  ·", t.datum, "—", t.titel);
