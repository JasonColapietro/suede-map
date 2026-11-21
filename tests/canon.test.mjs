import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Estate canon, 2026-09-19. Name ruling 2026-11-21: "Suede" is the one
// company name; "Suede AI", "Suede Labs AI" and "Suede Labs" survive only as
// schema alternateName values and one "formerly known as" alias line. Facts: 54 merged PRs across 46 external repositories (33
// substantive + 21 listings), kernel USB/IP patch at Public upstream v7 (under
// review, not merged), nine iOS apps on Jason's developer page.
//
// Identity spec v2 (2026-10-19): this map is a satellite. It references the
// canonical Organization and Person by @id and never mints its own values for
// them (no description, no alternateName, no competing sameAs). The canonical
// nodes live on suedeai.ai.

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");
const HTML = ["index.html", "press/index.html", "deck/index.html"];
const SERVED = [...HTML, "llms.txt", "README.md"];

const graphOf = (html) =>
  JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];

// Full nodes first; the deck nests its Organization inside WebPage.about.
const findById = (graph, id) =>
  graph.find((node) => node["@id"] === id) ??
  graph.map((node) => node.about).find((about) => about?.["@id"] === id && about.name);

test("accomplishments.json is the byte-identical canonical copy", async () => {
  const bytes = await readFile(new URL("content/accomplishments.json", root));
  // 2026-10-21: add the source-linked personal training credential record.
  // 2026-10-26: clarify the Amazon book formats; preserve the other records.
  // 2026-11-15: add the Clutch Top 30 Florida / Top 50 US AI consultants ranking.
  // 2026-11-21: name the company Suede; third-party headlines stay verbatim.
  assert.equal(
    createHash("sha1").update(bytes).digest("hex"),
    "4d2f42fc9532e59789ad8c43cdbbbee6cad8d56a",
  );
});

const ORG_STUB_KEYS = new Set(["@type", "@id", "name", "url", "founder", "alternateName", "parentOrganization", "address", "hasMerchantReturnPolicy"]);
const PERSON_STUB_KEYS = new Set(["@type", "@id", "name", "url", "jobTitle", "worksFor"]);

test("Organization schema matches the confirmed canonical company profile", async () => {
  for (const file of HTML) {
    const org = findById(graphOf(await read(file)), "https://suedeai.ai/#organization");
    assert.ok(org, `${file}: expected the Suede organization node`);
    assert.equal(org.name, "Suede", file);
    assert.equal(org.url, "https://suedeai.ai", file);
    for (const key of Object.keys(org)) assert.ok(ORG_STUB_KEYS.has(key), `${file}: Organization stub carries ${key}`);
    assert.deepEqual(org.alternateName, ["Suede AI", "Suede Labs AI", "Suede Labs"], file);
    assert.equal(org.parentOrganization?.name, "JC Investment Group LLC", file);
    assert.equal(org.address?.streetAddress, "138 Victorian Lane", file);
    assert.equal(org.address?.addressLocality, "Jupiter", file);
    assert.equal(org.address?.postalCode, "33458", file);
    assert.equal(org.hasMerchantReturnPolicy?.merchantReturnDays, 90, file);
    if (org.founder) assert.deepEqual(org.founder, { "@id": "https://suedeai.ai/founder#person" }, file);
  }
});

test("Person schema is a reference stub with the one canon jobTitle", async () => {
  for (const file of ["index.html", "press/index.html"]) {
    const person = findById(graphOf(await read(file)), "https://suedeai.ai/founder#person");
    assert.ok(person, `${file}: expected the founder Person node`);
    assert.equal(person.name, "Jason Colapietro", file);
    assert.equal(person.url, "https://suedeai.ai/founder", file);
    assert.equal(person.jobTitle, "Founder and CEO, Suede", file);
    assert.deepEqual(person.worksFor, { "@id": "https://suedeai.ai/#organization" }, file);
    for (const key of Object.keys(person)) assert.ok(PERSON_STUB_KEYS.has(key), `${file}: Person stub carries ${key}`);
  }
});

test("no schema node lists the canonical name \"Suede\" as an alternate name", async () => {
  for (const file of [...HTML, "ai-instructions/index.html"]) {
    const html = await read(file);
    assert.doesNotMatch(html, /"alternateName":\s*(?:"Suede"|\[[^\]]*"Suede"[,\]])/, file);
  }
});

test("no Suede AI or Suede Labs name in titles, meta, Open Graph, or Twitter cards", async () => {
  for (const file of HTML) {
    const html = await read(file);
    const head = [
      ...html.matchAll(/<title>[^<]*<\/title>|<meta\s[^>]*content="[^"]*"[^>]*>/gi),
    ].map((m) => m[0]);
    for (const tag of head) assert.doesNotMatch(tag, /Suede (?:AI|Labs)\b/i, `${file}: ${tag}`);
  }
});

// Public copy says "Suede". The retired names may appear only inside a
// schema alternateName, the one alias line per file, and the third-party
// records quoted verbatim: press headlines, external listing names, and the
// Google Web Guide query and answer. The #thin fix ledger is a historical
// record (append, never rewrite) and keeps its July 2026 heading.
const NAME_EXEMPT = [
  /Three things named “Suede AI Social”/g,
  /"alternateName":\s*\[[^\]]*\]/g,
  /formerly known as Suede AI and Suede Labs/g,
  /Suede labs ai review/g,
  /Suede Labs AI is highly rated by users, earning a 5\/5 rating from verified reviews/g,
  /Suede Labs AI(?:’s Long-Awaited SEO Cohort| Releases iOS Apps| Opens IP Visibility Audit)/g,
  /Suede Labs (?:Launches A Comprehensive|Brings AI-Powered|Advances in the Avalanche|and Top Competitors)/g,
  /Suede AI (?:vs\. Profound|opens SEO cohort)/g,
  /Suede AI (?:Generator|Agents: Directory|Visibility)/g,
];
const NAME_SURFACES = [...SERVED, "ai-instructions/index.html", "404.html", "llms-full.txt", "content/accomplishments.json", "docs/accomplishments.md", "sitemap.xml"];

test("public copy names the company Suede, never Suede AI or Suede Labs", async () => {
  for (const file of NAME_SURFACES) {
    let text = await read(file);
    for (const exempt of NAME_EXEMPT) text = text.replace(exempt, "");
    const hits = text.split("\n").flatMap((line, i) => (/\bSuede[\s\u00a0](?:AI|Labs)\b/i.test(line) ? [`${file}:${i + 1}`] : []));
    assert.deepEqual(hits, [], `retired company name in public copy: ${hits.join(", ")}`);
  }
});

test("at most one 'formerly known as Suede AI and Suede Labs' line per surface", async () => {
  for (const file of NAME_SURFACES) {
    const count = ((await read(file)).match(/formerly known as Suede AI and Suede Labs/g) || []).length;
    assert.ok(count <= 1, `${file} has ${count} alias lines`);
  }
});

test("canon facts replace the retired numbers", async () => {
  for (const file of SERVED) {
    const text = await read(file);
    assert.doesNotMatch(text, /\b4[0-8] merged pull requests|\b4[0-3] external repositories/, file);
    assert.doesNotMatch(text, /\b27 substantive/, file);
    assert.doesNotMatch(text, /Public upstream v6/, file);
    assert.doesNotMatch(text, /\b(?:8|eight) iOS apps/i, file);
  }
  const llms = await read("llms.txt");
  assert.match(llms, /54 merged pull requests\. 46 external repositories\./);
  assert.match(llms, /33 substantive code or documentation contributions and 21 accepted listings/);
  assert.match(llms, /Public upstream v7/);
});

test("every served page is self-canonical on https://map.suedeai.ai and matches the sitemap", async () => {
  const sitemap = await read("sitemap.xml");
  for (const [file, url] of [
    ["index.html", "https://map.suedeai.ai/"],
    ["press/index.html", "https://map.suedeai.ai/press/"],
  ]) {
    const html = await read(file);
    assert.match(html, new RegExp(`<link rel="canonical" href="${url}">`), file);
    assert.match(html, new RegExp(`<meta property="og:url" content="${url}">`), file);
    assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${url} missing from sitemap`);
  }
});
