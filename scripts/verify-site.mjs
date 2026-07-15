#!/usr/bin/env node

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
  "<title>Suede Universe Map | Every Suede Labs AI Surface</title>",
  "target search title",
);
expectIncludes("index.html", '"dateModified": "2026-07-15"', "current schema modification date");
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
for (const route of ["/", "/press/", "/deck/"]) {
  const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const entry = new RegExp(
    `<loc>https://map\\.suedeai\\.ai${escapedRoute}<\\/loc>[\\s\\S]*?<lastmod>2026-07-15<\\/lastmod>`,
  );
  if (!entry.test(sitemap)) {
    fail(`sitemap.xml: ${route} is missing the 2026-07-15 lastmod`);
  }
}

if (failures.length) {
  console.error(`Site verification failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Site verification passed: ${publicFiles.length} public surfaces, ${htmlFiles.length} JSON-LD blocks, local links, and sitemap dates checked.`);
