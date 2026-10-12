#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = normalize(join(dirname(fileURLToPath(import.meta.url)), ".."));
const publicFiles = ["index.html", "press/index.html", "deck/index.html", "llms.txt"];
const htmlFiles = publicFiles.filter((file) => file.endsWith(".html"));
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function expectIncludes(relativePath, text, label = text) {
  if (!read(relativePath).includes(text)) {
    fail(`${relativePath}: missing ${label}`);
  }
}

function expectExcludes(relativePath, pattern, label = pattern.toString()) {
  if (pattern.test(read(relativePath))) {
    fail(`${relativePath}: contains forbidden ${label}`);
  }
}

for (const relativePath of publicFiles) {
  expectExcludes(relativePath, /founded\s+(?:in\s+)?2016/i, '"founded 2016" claim');
  expectExcludes(relativePath, /parent\s+(?:entity|company)/i, "parent-entity claim");
  expectExcludes(relativePath, /the legal owner of it all/i, "unqualified legal-owner claim");
  expectExcludes(relativePath, /owns everything on this map/i, "unqualified map-ownership claim");
  expectExcludes(relativePath, /holds all \d+ domains and every property/i, "unqualified all-property claim");
  expectIncludes(relativePath, "does not establish legal title", "public-map legal boundary");
  expectIncludes(relativePath, "ownership percentages", "public-map ownership boundary");
}

expectIncludes(
  "index.html",
  "<title>Suede Universe Map | How Every Suede AI Surface Connects</title>",
  "target search title",
);
expectIncludes("index.html", '"dateModified": "2026-10-12"', "current schema modification date");
expectIncludes(
  "index.html",
  'jasoncolapietro.xyz</td><td class="quiet mono">→ <a href="https://seo.suedeai.ai/field-notes"',
  "jasoncolapietro.xyz points at its seo.suedeai.ai/field-notes destination",
);
expectExcludes(
  "index.html",
  /jasoncolapietro\.xyz[\s\S]{0,240}Not reachable/i,
  "stale jasoncolapietro.xyz reachability claim",
);
expectIncludes("press/index.html", "Florida document L19000146068", "source-bounded JCIG filing reference");

for (const relativePath of htmlFiles) {
  const html = read(relativePath);
  if (!/^<!doctype html>/i.test(html)) {
    fail(`${relativePath}: missing HTML doctype`);
  }

  const canonicalMatches = [...html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/gi)];
  if (canonicalMatches.length !== 1) {
    fail(`${relativePath}: expected exactly one canonical URL, found ${canonicalMatches.length}`);
  }

  const schemas = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  if (schemas.length !== 1) {
    fail(`${relativePath}: expected exactly one JSON-LD block, found ${schemas.length}`);
  }

  for (const [, rawJson] of schemas) {
    try {
      const schema = JSON.parse(rawJson);
      const serialized = JSON.stringify(schema);
      for (const key of ["parentOrganization", "subOrganization"]) {
        if (serialized.includes(`\"${key}\"`)) {
          fail(`${relativePath}: JSON-LD contains forbidden ${key}`);
        }
      }
    } catch (error) {
      fail(`${relativePath}: invalid JSON-LD (${error.message})`);
    }
  }

  if (!html.includes('https://suedeai.ai/#organization')) {
    fail(`${relativePath}: JSON-LD is missing the canonical Suede organization @id`);
  }
  if (html.includes('https://suedeai.ai/#org"')) {
    fail(`${relativePath}: JSON-LD still uses the split #org entity identifier`);
  }

  for (const [, attribute, value] of html.matchAll(/\b(href|src)="([^"]+)"/gi)) {
    if (/^(?:https?:|mailto:|#|data:|javascript:)/i.test(value)) continue;
    const cleanPath = value.split(/[?#]/, 1)[0];
    if (!cleanPath || cleanPath.startsWith("//")) continue;

    let candidate;
    if (cleanPath.startsWith("/")) {
      candidate = join(repoRoot, cleanPath.slice(1));
    } else {
      candidate = join(repoRoot, dirname(relativePath), cleanPath);
    }

    if (cleanPath.endsWith("/")) candidate = join(candidate, "index.html");
    if (!extname(candidate) && existsSync(join(candidate, "index.html"))) {
      candidate = join(candidate, "index.html");
    }
    if (!existsSync(candidate)) {
      fail(`${relativePath}: broken local ${attribute} ${value}`);
    }
  }
}

expectIncludes("index.html", "answered a live check July&nbsp;15,&nbsp;2026", "fresh green-dot verification date");
expectIncludes("press/index.html", "entity filing checked July 15, 2026", "source-specific verification date");
expectIncludes("deck/index.html", "entity language checked July 15, 2026", "source-specific verification date");

const sitemap = read("sitemap.xml");
if (!/<loc>https:\/\/map\.suedeai\.ai\/<\/loc>[\s\S]*?<lastmod>2026-10-12<\/lastmod>/.test(sitemap)) {
  fail("sitemap.xml: root is missing the 2026-10-12 lastmod");
}

// The full-text feed is generated from index.html and press/index.html, so a
// page edit without a rebuild leaves agents reading stale copy.
{
  const run = spawnSync(process.execPath, [join(repoRoot, "scripts", "build-llms-full.mjs"), "--check"], { encoding: "utf8" });
  if (run.status !== 0) fail(`llms-full.txt: ${run.stderr.trim() || "stale"}`);
  const full = read("llms-full.txt");
  if (!full.startsWith("# ")) fail("llms-full.txt: must open with a Markdown heading");
  if (!read("llms.txt").includes("https://map.suedeai.ai/llms-full.txt")) fail("llms.txt: must link llms-full.txt");
  for (const [file, url] of [["index.html", "https://map.suedeai.ai/"], ["press/index.html", "https://map.suedeai.ai/press/"], ["ai-instructions/index.html", "https://map.suedeai.ai/ai-instructions/"]]) {
    const html = read(file);
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const description = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
    if (title.length > 65) fail(`${file}: title is ${title.length} characters`);
    if (description.length < 120 || description.length > 160) fail(`${file}: description is ${description.length} characters`);
    if (!/<meta property="og:image" content="https:\/\//.test(html)) fail(`${file}: missing absolute og:image`);
    if (!html.includes('<meta name="twitter:card" content="summary_large_image">')) fail(`${file}: missing twitter card`);
    if (url !== "https://map.suedeai.ai/" && !html.includes('"BreadcrumbList"')) fail(`${file}: missing BreadcrumbList`);
    if (!html.includes(`<link rel="canonical" href="${url}">`)) fail(`${file}: canonical is not ${url}`);
  }
  for (const file of ["index.html", "press/index.html", "llms.txt"]) {
    if (read(file).includes("map.suedeai.ai/deck")) fail(`${file}: links the redirected /deck`);
  }
}

// /press/ came off the hold on 2026-09-04 (tests/registry-marketing-hold.test.mjs
// requires it in the sitemap); only the deck stays held.
for (const heldRoute of ["/deck/"]) {
  if (sitemap.includes(`<loc>https://map.suedeai.ai${heldRoute}</loc>`)) {
    fail(`sitemap.xml: held route ${heldRoute} must not be advertised`);
  }
}

if (failures.length) {
  console.error(`Site verification failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Site verification passed: ${publicFiles.length} public surfaces, ${htmlFiles.length} JSON-LD blocks, local links, and sitemap dates checked.`);
