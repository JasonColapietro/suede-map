import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

// Guard: every served, indexable HTML page carries <meta name="keywords"> with
// 5-12 lowercase, comma-separated search terms. deck/index.html is not served:
// vercel.json redirects /deck and /deck/:path* off this host, so it is exempt.

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");
const REDIRECTED = new Set(["deck/index.html"]);

async function htmlFiles(dir = "") {
  const entries = await readdir(new URL(dir || ".", root), { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const rel = dir + entry.name;
    if (entry.isDirectory()) out.push(...(await htmlFiles(rel + "/")));
    else if (entry.name.endsWith(".html")) out.push(rel);
  }
  return out;
}

test("the redirected deck really is redirected off this host", async () => {
  const vercel = JSON.parse(await read("vercel.json"));
  const sources = vercel.redirects.map((r) => r.source);
  for (const source of ["/deck", "/deck/", "/deck/:path*"]) assert.ok(sources.includes(source), source);
});

test("every served indexable page has a meta keywords tag", async () => {
  const pages = (await htmlFiles()).filter((f) => !REDIRECTED.has(f));
  assert.ok(pages.includes("index.html") && pages.includes("press/index.html"));
  for (const file of pages) {
    const html = await read(file);
    if (/<meta name="robots" content="[^"]*noindex/.test(html)) continue;
    const tags = html.match(/<meta name="keywords" content="([^"]*)">/g) ?? [];
    assert.equal(tags.length, 1, `${file}: exactly one keywords tag`);
    const terms = tags[0].match(/content="([^"]*)"/)[1].split(", ");
    assert.ok(terms.length >= 5 && terms.length <= 12, `${file}: 5-12 terms`);
    assert.equal(new Set(terms).size, terms.length, `${file}: duplicate terms`);
    for (const term of terms) {
      assert.equal(term, term.toLowerCase().trim(), `${file}: "${term}" lowercase and trimmed`);
      assert.ok(term.length > 0, `${file}: empty term`);
      assert.ok(!term.includes("suede labs ai"), `${file}: brand is Suede AI`);
    }
  }
});

test("every sitemap URL maps to a page with keywords", async () => {
  const sitemap = await read("sitemap.xml");
  const locs = [...sitemap.matchAll(/<loc>https:\/\/map\.suedeai\.ai\/([^<]*)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length > 0);
  for (const path of locs) {
    const html = await read(path + "index.html");
    assert.match(html, /<meta name="keywords" content="[^"]+">/, path || "/");
  }
});
