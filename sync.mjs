// Liest die Notion-Datenbank "LinkedIn Cockpit – Termine-Ticker" und schreibt
// termine.json. Läuft als GitHub Action (stündlich) und lokal mit denselben Env-Vars.
// Env: NOTION_API_KEY (Pflicht), NOTION_TERMINE_DB (optional, Default unten).
import { writeFileSync } from "node:fs";

const NOTION_KEY = process.env.NOTION_API_KEY;
const DB = process.env.NOTION_TERMINE_DB || "bae3dd9112484b05bacec8d66389cbac";
const CTA = { label: "Alle Programme", url: "https://manuela-ruppert.de/ki-coaching" };

if (!NOTION_KEY) { console.error("NOTION_API_KEY fehlt"); process.exit(1); }

// Notion wirft sporadisch 5xx/522 (kurze Server-Aussetzer) — die überbrücken
// Retries mit Wartezeit. Echte Fehler (401, 404 …) brechen weiterhin sofort ab.
async function queryNotion() {
  const wartezeiten = [10_000, 30_000, 60_000];
  for (let versuch = 0; ; versuch++) {
    let res = null;
    try {
      res = await fetch(`https://api.notion.com/v1/databases/${DB}/query`, {
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
    } catch {} // Netzwerkfehler → wie transienter Serverfehler behandeln
    if (res?.ok) return res.json();
    const status = res ? "Notion " + res.status : "Netzwerkfehler";
    const transient = !res || res.status === 408 || res.status === 429 || res.status >= 500;
    if (!transient || versuch >= wartezeiten.length) {
      console.error(status + ": " + (res ? (await res.text()).slice(0, 300) : ""));
      process.exit(1);
    }
    console.log(`${status} (Versuch ${versuch + 1}/${wartezeiten.length + 1}) — neuer Versuch in ${wartezeiten[versuch] / 1000}s …`);
    await new Promise((r) => setTimeout(r, wartezeiten[versuch]));
  }
}

const data = await queryNotion();
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
