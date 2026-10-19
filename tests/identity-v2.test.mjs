import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Suede AI identity spec v2 (2026-10-19). Suede AI is an agentic platform
// company; music and creator software is a separate, later product line; the
// founder's record leads. These guards keep the served files on that canon.

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");

const COMPANY_ONE_LINER =
  "Suede AI is an agentic platform company founded in 2024 by engineer Jason Colapietro in West Palm Beach, Florida. It builds and runs AI agent platforms that businesses use to manage their work, and white-labels them for agencies and their clients.";
const COMPANY_META =
  "Suede AI builds AI agent platforms businesses use to run their work, and white-labels them for agencies. Founded 2024 by engineer Jason Colapietro.";
const OFFICIAL_DOMAINS_LINE =
  "Suede AI’s official sites are suedeai.ai, suedeai.org and their subdomains. It was founded in 2024 by Jason Colapietro.";
const CAPTURE_DISCLAIMER = "Dated model output, not an endorsement or a ranking Google issued.";
const MARKETS_INSIDER_TITLE =
  "“Award-Winning Developer Jason Colapietro Opens Suede Labs AI’s Long-Awaited SEO Cohort”";

// Everything Vercel serves from this repo that carries copy (deck/ is redirected away).
const SERVED = [
  "index.html",
  "press/index.html",
  "ai-instructions/index.html",
  "404.html",
  "llms.txt",
  "llms-full.txt",
  "docs/accomplishments.md",
  "content/accomplishments.json",
];

const withoutUrls = (text) => text.replace(/https?:\/\/[^\s"'<>)]+/g, "");

test("the canonical one-liner and official-domains line are published verbatim", async () => {
  for (const file of ["index.html", "press/index.html", "ai-instructions/index.html", "llms.txt", "llms-full.txt"]) {
    const text = await read(file);
    assert.ok(text.includes(COMPANY_ONE_LINER), `${file}: COMPANY_ONE_LINER`);
    assert.ok(text.includes(OFFICIAL_DOMAINS_LINE), `${file}: OFFICIAL_DOMAINS_LINE`);
  }
});

test("meta descriptions say what Suede AI is", async () => {
  for (const file of ["index.html", "press/index.html"]) {
    const html = await read(file);
    assert.ok(html.includes(`<meta name="description" content="${COMPANY_META}">`), file);
    assert.match(html, /<title>[^<]*Suede[^<]*<\/title>/, file);
  }
  assert.match(await read("index.html"), /<title>Suede Universe Map \|/);
});

test("banned claims stay off every served file", async () => {
  const banned = [
    /Suede Foundation/,
    /\b(?:Anthropic|Claude) partner\b/i,
    /\bGoogle partner\b/i,
    /\bpatented\b/i,
    /\btop[ -]15\b/i,
    /multi-?million/i,
    /exited for millions/i,
    /in use across the industry/i,
    /featured on Elon Musk/i,
    /Elon Musk’s timeline/,
    /fully diluted|\bFDV\b|\$(?:23\.9|28|30)\s?(?:M\b|million)/i,
    /info@suedeai\.org/,
    /other compan(?:y|ies) (?:called|named) Suede|not affiliated with/i,
  ];
  for (const file of SERVED) {
    const text = withoutUrls(await read(file));
    for (const pattern of banned) assert.doesNotMatch(text, pattern, `${file}: ${pattern}`);
  }
});

test("Markets Insider is a FinanceWire press release, never a Business Insider placement", async () => {
  for (const file of SERVED) {
    const text = withoutUrls(await read(file));
    assert.doesNotMatch(text, /Business Insider/, `${file}: Business Insider named as an outlet`);
    // "Award-Winning" appears only inside the quoted press-release headline.
    const outsideQuote = text.split(MARKETS_INSIDER_TITLE).join("");
    assert.doesNotMatch(outsideQuote, /award-winning/i, `${file}: Award-Winning in Suede's voice`);
    if (text.includes(MARKETS_INSIDER_TITLE)) {
      assert.ok(text.includes(`Markets Insider (FinanceWire press release): ${MARKETS_INSIDER_TITLE}`), file);
    }
  }
});

test("every Google or Gemini capture carries the dated-output disclaimer", async () => {
  for (const file of SERVED) {
    const text = await read(file);
    if (/Web Guide|Gemini places|5\/5/.test(text)) assert.ok(text.includes(CAPTURE_DISCLAIMER), file);
  }
});

test("links point at the canonical hosts and the moved suedeai.ai pages", async () => {
  for (const file of ["index.html", "press/index.html", "llms.txt", "llms-full.txt"]) {
    const text = await read(file);
    assert.doesNotMatch(text, /href="https?:\/\/social\.suedeai\.ai|\]\(https:\/\/social\.suedeai\.ai/, `${file}: link suede.social`);
    assert.doesNotMatch(
      text,
      /seo\.suedeai\.ai\/(?:ai-operations|managed-ai-agents|forward-deployed-engineer|ai-integration|ai-workflow-automation|suede-ai-vs)/,
      `${file}: moved page`,
    );
  }
});

test("the first shelf is the agentic business stack, and music comes later", async () => {
  const html = await read("index.html");
  const shelves = html.split('<div class="shelf">').slice(1);
  const first = shelves[0];
  assert.match(first, /<h3>Run your business on AI agents<\/h3>/);
  for (const href of [
    "https://agents.suedeai.ai",
    "https://suedeai.ai/white-label",
    "https://suedeai.ai/managed-ai-agents",
    "https://suedeai.ai/ai-operations",
    "https://seo.suedeai.ai",
    "https://agentix.suedeai.ai",
    "https://signal.suedeai.ai",
    "https://api.suedeai.xyz",
  ]) {
    assert.ok(first.includes(`href="${href}"`), `first shelf: ${href}`);
  }
  const musicShelf = shelves.findIndex((s) => s.includes('href="https://studio.suedeai.ai"'));
  assert.ok(musicShelf > 0, "music shelf follows the business stack");
});

test("the router puts business and agent rows first", async () => {
  const html = await read("index.html");
  const router = html.slice(html.indexOf('<section class="sect" id="router">'));
  const rows = [...router.matchAll(/<tr><td>([\s\S]*?)<\/td><td[^>]*>([\s\S]*?)<\/td><\/tr>/g)];
  const at = (href) => rows.findIndex((r) => r[2].includes(`href="${href}"`));
  assert.ok(at("https://suedeai.ai/white-label") >= 0, "white-label row");
  assert.ok(at("https://suedeai.ai/managed-ai-agents") >= 0, "managed agents row");
  for (const music of ["https://distro.suedeai.ai", "https://studio.suedeai.ai", "https://strumly.suedeai.ai"]) {
    for (const business of ["https://agents.suedeai.ai", "https://suedeai.ai/white-label", "https://suedeai.ai/managed-ai-agents"]) {
      assert.ok(at(business) < at(music), `${business} before ${music}`);
    }
  }
});

test("Follow everywhere labels the founder's LinkedIn and lists the company page", async () => {
  const html = await read("index.html");
  assert.ok(html.includes('<a href="https://www.linkedin.com/in/jasoncolapietro" target="_blank" rel="noopener">Jason’s LinkedIn</a>'));
  assert.ok(html.includes('href="https://www.linkedin.com/company/suede-labs"'));
  assert.match(html, /youtube\.com\/@aisuede[^<]*<\/a><\/td><td class="quiet">The Suede AI channel/);
});

test("Level 1 leads with the founder's linked engineering record, books and apps", async () => {
  const html = await read("index.html");
  const level1 = html.slice(html.indexOf("Level 1 · The person"), html.indexOf("Level 2 · The company"));
  for (const proof of [
    "https://github.com/search?q=is%3Apr+author%3AJasonColapietro+is%3Amerged",
    "https://github.com/jestjs/jest/pull/16296",
    "https://github.com/backstage/backstage/pull/35102",
    "https://github.com/paritytech/polkadot-sdk/pull/12853",
    "https://www.amazon.com/dp/B0HHTMJWB4",
    "https://www.amazon.com/dp/B0HHTF3LG1",
    "https://apps.apple.com/us/developer/jason-colapietro/id1895958699",
    "https://suedeai.ai/founder",
  ]) {
    assert.ok(level1.includes(proof), `Level 1 links ${proof}`);
  }
  const level3 = html.slice(html.indexOf("Level 3 · The brand"), html.indexOf("Level 4 · The tools"));
  assert.ok(level3.includes(COMPANY_ONE_LINER), "Level 3 carries the one-liner");
  assert.doesNotMatch(level3, /prove they made something/);
});
