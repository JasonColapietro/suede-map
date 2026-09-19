import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Estate canon, 2026-09-19: "Suede AI" is the one primary company name; Suede Labs
// and Suede Labs AI are alternates only. Facts: 49 merged PRs across 44 external
// repositories (28 substantive + 21 listings), kernel USB/IP patch at Public
// upstream v7 (under review, not merged), nine iOS apps on Jason's developer page.

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
  assert.equal(
    createHash("sha1").update(bytes).digest("hex"),
    "15e282cb8d8b259103da12d186913fd55060295e",
  );
});

test("Organization schema: Suede AI primary, Suede Labs names as alternates only", async () => {
  for (const file of HTML) {
    const org = findById(graphOf(await read(file)), "https://suedeai.ai/#organization");
    assert.ok(org, `${file}: expected the Suede AI organization node`);
    assert.equal(org.name, "Suede AI", file);
    assert.deepEqual(org.alternateName, ["Suede Labs", "Suede Labs AI"], file);
  }
});

test("Person schema carries the canon jobTitle", async () => {
  for (const file of ["index.html", "press/index.html"]) {
    const person = findById(graphOf(await read(file)), "https://suedeai.ai/founder#person");
    assert.ok(person, `${file}: expected the founder Person node`);
    assert.equal(person.jobTitle, "Founder and CEO, Suede AI", file);
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
  assert.match(llms, /49 merged pull requests\. 44 external repositories\./);
  assert.match(llms, /28 substantive code or documentation contributions and 21 accepted listings/);
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
