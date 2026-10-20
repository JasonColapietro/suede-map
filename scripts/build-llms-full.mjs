#!/usr/bin/env node
// Build llms-full.txt from the served pages.
//
// Usage: node scripts/build-llms-full.mjs [--check]
//
// The map has no data file (the HTML is the database), so the full-text feed
// is read straight out of index.html and press/index.html: every layer, shelf
// card, router row and FAQ answer on the map, and every section of the press
// kit. Re-run after editing either page; --check exits 1 when the committed
// file is stale, and scripts/verify-site.mjs runs it.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " ", middot: "·",
  rarr: "→", mdash: "-", ndash: "-", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", hellip: "…",
};
const decode = (s) =>
  s
    .replace(/&(#\d+|[a-z]+);/gi, (m, name) =>
      ENTITIES[name] ?? (name.startsWith("#") ? String.fromCodePoint(Number(name.slice(1))) : m))
    .replace(/[ \t\r\n]+/g, " ")
    .trim();

// Inline markup to Markdown: links keep their absolute URL, bold stays bold.
function inline(fragment) {
  return decode(
    fragment
      .replace(/<(script|style|button|svg)\b[\s\S]*?<\/\1>/gi, "")
      .replace(/<a\b[^>]*href="(https?:[^"]+|\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, text) => {
        const label = decode(text.replace(/<[^>]+>/g, ""));
        const url = href.startsWith("/") ? `https://map.suedeai.ai${href}` : href;
        return label ? `[${label.replace(/\s*↗$/, "")}](${url})` : "";
      })
      .replace(/<(b|strong)>([\s\S]*?)<\/\1>/gi, (m, tag, inner) => {
        const text = decode(inner.replace(/<[^>]+>/g, ""));
        return text ? `**${text}**` : "";
      })
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/ +([.,;:)])/g, "$1");
}

const between = (html, start, end) => {
  const i = html.indexOf(start);
  if (i === -1) throw new Error(`missing marker ${start}`);
  const j = html.indexOf(end, i + start.length);
  return html.slice(i, j === -1 ? undefined : j);
};

function cards(fragment) {
  const out = [];
  for (const m of fragment.matchAll(/<a class="site[^"]*" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const body = m[2];
    const name = inline((body.match(/<span class="(?:name|doorword)">([\s\S]*?)<\/span>/) || [])[1] || "");
    const url = m[1];
    const desc = [...body.matchAll(/<p class="(?:desc|usewhen|fwd)">([\s\S]*?)<\/p>/g)].map((p) => inline(p[1])).join(" ");
    out.push(`- [${name || url}](${url})${desc ? `: ${desc}` : ""}`);
  }
  return out;
}

function mapText() {
  const html = read("index.html");
  const lines = [];
  const hero = between(html, '<header class="hero">', "</header>");
  lines.push(`## ${inline(hero.match(/<h1>([\s\S]*?)<\/h1>/)[1])}`, "");
  for (const p of hero.matchAll(/<p class="lede">([\s\S]*?)<\/p>/g)) lines.push(inline(p[1]), "");

  const spine = between(html, '<section class="shortversion">', "<!-- ROUTER -->");
  for (const layer of spine.split(/<div class="layer rv"[^>]*>/).slice(1)) {
    const eyebrow = inline((layer.match(/<p class="layer-eyebrow">([\s\S]*?)<\/p>/) || [])[1] || "");
    const title = inline(layer.match(/<h2>([\s\S]*?)<\/h2>/)[1]);
    lines.push(`## ${eyebrow ? `${eyebrow}: ` : ""}${title}`, "");
    const intro = layer.split(/<div class="cardgrid|<div class="shelf">/)[0];
    for (const p of intro.matchAll(/<p(?: class="explain[^"]*")?(?: style="[^"]*")?>([\s\S]*?)<\/p>/g)) lines.push(inline(p[1]), "");
    const shelves = layer.split('<div class="shelf">');
    lines.push(...cards(shelves[0]));
    for (const shelf of shelves.slice(1)) {
      lines.push("", `### ${inline(shelf.match(/<h3>([\s\S]*?)<\/h3>/)[1])}`, "");
      const sub = shelf.match(/<p class="shelf-sub">([\s\S]*?)<\/p>/);
      if (sub) lines.push(inline(sub[1]), "");
      lines.push(...cards(shelf));
    }
    const tables = [...layer.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
    for (const row of tables) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => inline(c[1]));
      if (cells.length) lines.push(`- ${cells.filter(Boolean).join(": ")}`);
    }
    lines.push("");
  }

  const router = between(html, '<section class="sect" id="router">', "</section>");
  lines.push(`## ${inline(router.match(/<h2>([\s\S]*?)<\/h2>/)[1])}`, "");
  for (const row of router.matchAll(/<tr><td>([\s\S]*?)<\/td><td[^>]*>([\s\S]*?)<\/td><\/tr>/g)) {
    lines.push(`- ${inline(row[1])}: ${inline(row[2])}`);
  }
  lines.push("");

  const faq = between(html, '<section class="sect" id="faq">', "</section>");
  lines.push(`## ${inline(faq.match(/<h2>([\s\S]*?)<\/h2>/)[1])}`, "");
  for (const q of faq.matchAll(/<h3>([\s\S]*?)<\/h3><\/summary>\s*<p>([\s\S]*?)<\/p>/g)) {
    lines.push(`### ${inline(q[1])}`, "", inline(q[2]), "");
  }
  return lines;
}

function pressText() {
  const html = read("press/index.html");
  const lines = ["## Press kit", "", "Source: https://map.suedeai.ai/press/", ""];
  const head = between(html, '<header class="masthead">', "</header>");
  lines.push(`### ${inline(head.match(/<h1>([\s\S]*?)<\/h1>/)[1])}`, "");
  for (const p of head.matchAll(/<p class="lede">([\s\S]*?)<\/p>/g)) lines.push(inline(p[1]), "");
  for (const id of ["boilerplate", "facts", "numbers", "how", "founder", "guest", "quotes", "angles", "coverage"]) {
    const start = html.indexOf(`<section id="${id}">`);
    if (start === -1) continue;
    const sect = html.slice(start, html.indexOf("</section>", start));
    lines.push(`### ${inline(sect.match(/<h2>([\s\S]*?)<\/h2>/)[1])}`, "");
    for (const angle of sect.matchAll(/<div class="angle"><b>([\s\S]*?)<\/b><span>([\s\S]*?)<\/span><\/div>/g)) {
      lines.push(`- **${inline(angle[1])}** ${inline(angle[2])}`);
    }
    for (const block of sect.matchAll(/<(p|li|tr|div class="stat"|div class="col")[^>]*>([\s\S]*?)<\/(?:p|li|tr|div)>/g)) {
      if (/class="sub"/.test(block[0]) && /copy button/i.test(block[0])) continue;
      if (block[1] === "tr") {
        const cells = [...block[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => inline(c[1]));
        if (cells.length) lines.push(`- ${cells.join(": ")}`);
        continue;
      }
      const text = inline(block[2]);
      if (text) lines.push(block[1] === "li" ? `- ${text}` : text, "");
    }
    lines.push("");
  }
  return lines;
}

const index = read("index.html");
const description = decode(index.match(/<meta name="description" content="([^"]*)"/)[1]);
const text = [
  "# Suede Universe Map: full text",
  "",
  `> ${description}`,
  "",
  "Source: https://map.suedeai.ai/",
  "Suede AI is an agentic platform company founded in 2024 by engineer Jason Colapietro in West Palm Beach, Florida. It builds and runs AI agent platforms that businesses use to manage their work, and white-labels them for agencies and their clients.",
  "",
  "## Entity",
  "",
  "Suede AI’s official sites are suedeai.ai, suedeai.org and their subdomains. It was founded in 2024 by Jason Colapietro.",
  "",
  "- Organization: https://suedeai.ai/#organization",
  "- Founder: Jason Colapietro, who publishes under the pen name Johnny Suede. https://suedeai.ai/founder#person",
  "",
  "Claim boundary: this public operating map documents public pages, links, filings, and stated roles. It does not establish legal title, parent/subsidiary relationships, or ownership percentages.",
  "",
  ...mapText(),
  ...pressText(),
  "## Citation",
  "",
  "- Cite https://map.suedeai.ai/ for how the surfaces connect, and the destination page for any product claim.",
  "- Source and citation guide: https://map.suedeai.ai/ai-instructions/",
  "- Short summary for LLMs: https://map.suedeai.ai/llms.txt",
  "",
]
  .join("\n")
  .replace(/\n{3,}/g, "\n\n");

const target = join(root, "llms-full.txt");
if (process.argv.includes("--check")) {
  if (!existsSync(target) || readFileSync(target, "utf8") !== text) {
    console.error("llms-full.txt is stale: run node scripts/build-llms-full.mjs");
    process.exit(1);
  }
} else {
  writeFileSync(target, text);
  console.log(`wrote llms-full.txt (${Buffer.byteLength(text)} bytes)`);
}
