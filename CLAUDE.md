# CLAUDE.md — suede-map

## What this is

The **Suede Universe Map** — live at **https://map.suedeai.ai** — a plain-English wayfinding page for the whole Suede Labs AI / JC Investment Group ecosystem, written for non-technical readers. Pure static site, **no build step, no package.json, no framework**. Three pages:

- `index.html` (~1100 lines) — the map itself: everything (content, CSS, JS) is inline in this one file.
- `deck/index.html` — ecosystem investor deck (map.suedeai.ai/deck/).
- `press/index.html` — press kit; `media/` holds its mp4s (raw takes `media/raw-*.mp4` are git- and vercel-ignored).

## Architecture invariants — the "schema" is markup convention

There is no JSON/data file. Surfaces are registered by hand as `<a class="site">` cards inside `.cardgrid` blocks, organized as a **five-level public operating graph** in `index.html` (`<section class="map" id="map">`):

1. Level 1 the person → 2. the public-record entity → 3. the brand's three front doors (`.cardgrid.doors`) → 4. six `.shelf` groups of shipped tools → 5. publicly listed domains — levels joined by source-bounded `.rail-verb` connectors.

The graph is a wayfinding and operating map, not a cap table or title record. Do not infer legal ownership, parent/subsidiary relationships, or ownership percentages from public links, a domain directory, or brand proximity.

**Card anatomy** (copy an existing card, keep the shape):
```html
<a class="site" href="..." target="_blank" rel="noopener">
  <div class="toprow"><span class="name">Human name</span> <span class="tag-dev">dev</span></div>
  <span class="url"><span class="dot-live"></span>host.suedeai.ai ↗</span>
  <p class="desc">One plain-English sentence.</p>
  <p class="fwd">→ forwards to ...</p>   <!-- optional: alias/forward note -->
</a>
```

- **`dot-live` is a verification claim, not decoration.** The footer promises every green-dot address answered a live request on the stamped date. Only add `dot-live` after you have actually curl'd the URL; omit the dot for third-party surfaces (Substack, Amazon) that carry no liveness claim.
- After the spine: the **link router** (`#router`, an "I just want to…" `.ledger` table) and the **thin-spots fix ledger** (`#thin`, `.thin-item` entries with a `⚑` head, problem paragraph, and `Fixed July 4` line). The ledger is a historical record — append, don't rewrite.
- Scroll-reveal uses class `rv` + the inline IntersectionObserver script; the hero constellation canvas is the only other JS. Both honor `prefers-reduced-motion`. No external scripts — keep it self-contained.
- File ends with `<!-- ARTIFACT-END -->` — keep it last.

## Known traps (facts the map itself asserts — don't contradict them)

- **Agentix ≠ Agent Studio:** `agents.suedeai.ai` = build agents; `agentix.suedeai.ai` = earnings tracker. The map exists partly to keep these straight.
- **`api.suedeai.xyz` is the canonical API host**; `api.suedeai.ai` answers identically but is not canonical, and deliberately **no 301** exists (redirecting a live pay-per-call gateway breaks agent clients). Fixed/verified July 4 — see `#thin`.
- **`suede.social` and `social.suedeai.ai` are one website** (plus a separate iOS app, id6770668793). Two addresses, one place.
- **`hub2.suedeai.ai` 308s to `hub.suedeai.ai`** — one hub only.
- Current Apple app names: "Suede: AI Music Generator" (was Studio Inspiration) and "Suede Guitar Tuner & Studio" (was Studio Guitar). Don't reintroduce the old names.
- `audit.suedeai.ai` and `flagship.suedeai.ai` are name-tag aliases mirroring suedeai.ai (reserve-domains ledger).
- Registering a new surface = card in the right shelf **and** (usually) a `#router` row **and** a live check **and** bumping the footer date lines + `sitemap.xml` `<lastmod>`.

## Verification commands

No package.json — nothing to lint/build. Real checks:

```bash
# Local preview (matches .claude/launch.json: name "suede-map-static")
python3 -m http.server 8934   # from repo root, then open localhost:8934

# Liveness check before adding/keeping a dot-live (example)
curl -s -o /dev/null -w '%{http_code}\n' https://map.suedeai.ai/

# Every green-dot URL in the file, for a sweep
grep -o 'href="https://[^"]*"' index.html | sort -u
```

## The 5 things a new agent gets wrong here

1. Looks for a data file / build pipeline. There isn't one — the HTML is the database; edit `index.html` directly.
2. Adds a `dot-live` dot without curl-ing the address, breaking the footer's "every green dot answered a live request" promise.
3. Rewrites the `#thin` fix ledger instead of appending. It's the audit trail (commit 5211ad9 turned it from open flags into a fix record — keep it that way).
4. Writes insider jargon in `.desc` lines. House style is plain English for non-technical readers ("the filing cabinet", "three front doors") — that IS the product.
5. Forgets the sibling surfaces: updating a card without checking `deck/index.html`, `press/index.html`, `sitemap.xml` lastmod, and the footer date stamps.

## Deploy

Vercel static deploy, repo root = project root. Linked project: `suede-map` (`.vercel/project.json`, `prj_R60pn0Xb2O5QRGXuQtkhsM7wJfDG`). **Push to `main` does NOT auto-deploy** (verified 2026-07-10 — a push produced no build; earlier "push → production" note was wrong). Ship with `npx vercel --prod --yes` from repo root, then curl map.suedeai.ai to confirm the new content is serving. `vercel.json`'s `ignoreCommand` kills all preview builds (house rule). `.vercelignore` excludes `media/raw-*.mp4`.

Audited at commit 5211ad9b5bca336972e5555c91fb9a292bb1023b (2026-07-06).
