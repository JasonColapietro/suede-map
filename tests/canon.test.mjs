import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Estate canon, 2026-09-19 (name ruling 2026-09-30): "Suede AI" is the one primary
// company name. Facts: 54 merged PRs across 46 external repositories (33
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
  assert.equal(
    createHash("sha1").update(bytes).digest("hex"),
    "ef9824a47c070a354e1faadc5549d7dfef6f2b29",
  );
});

const ORG_STUB_KEYS = new Set(["@type", "@id", "name", "url", "founder"]);
const PERSON_STUB_KEYS = new Set(["@type", "@id", "name", "url", "jobTitle", "worksFor"]);

test("Organization schema is a reference stub to the canonical Suede AI node", async () => {
  for (const file of HTML) {
    const org = findById(graphOf(await read(file)), "https://suedeai.ai/#organization");
    assert.ok(org, `${file}: expected the Suede AI organization node`);
    assert.equal(org.name, "Suede AI", file);
    assert.equal(org.url, "https://suedeai.ai", file);
    for (const key of Object.keys(org)) assert.ok(ORG_STUB_KEYS.has(key), `${file}: Organization stub carries ${key}`);
    if (org.founder) assert.deepEqual(org.founder, { "@id": "https://suedeai.ai/founder#person" }, file);
  }
});

test("Person schema is a reference stub with the one canon jobTitle", async () => {
  for (const file of ["index.html", "press/index.html"]) {
    const person = findById(graphOf(await read(file)), "https://suedeai.ai/founder#person");
    assert.ok(person, `${file}: expected the founder Person node`);
    assert.equal(person.name, "Jason Colapietro", file);
    assert.equal(person.url, "https://suedeai.ai/founder", file);
    assert.equal(person.jobTitle, "Founder and CEO, Suede AI", file);
    assert.deepEqual(person.worksFor, { "@id": "https://suedeai.ai/#organization" }, file);
    for (const key of Object.keys(person)) assert.ok(PERSON_STUB_KEYS.has(key), `${file}: Person stub carries ${key}`);
  }
});

test("no schema node gives Suede AI the bare alternate name \"Suede\"", async () => {
  for (const file of [...HTML, "ai-instructions/index.html"]) {
    const html = await read(file);
    assert.doesNotMatch(html, /"alternateName":\s*(?:"Suede"|\[[^\]]*"Suede"[,\]])/, file);
  }
});

test("no Suede Labs name in titles, meta, Open Graph, or Twitter cards", async () => {
  for (const file of HTML) {
    const html = await read(file);
    const head = [
      ...html.matchAll(/<title>[^<]*<\/title>|<meta\s[^>]*content="[^"]*"[^>]*>/gi),
    ].map((m) => m[0]);
    for (const tag of head) assert.doesNotMatch(tag, /Suede Labs/, `${file}: ${tag}`);
  }
});

test("at most one 'also known as Suede Labs' per surface", async () => {
  for (const file of SERVED) {
    const count = ((await read(file)).match(/also known as Suede Labs/g) || []).length;
    assert.ok(count <= 1, `${file} has ${count} "also known as Suede Labs" mentions`);
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
