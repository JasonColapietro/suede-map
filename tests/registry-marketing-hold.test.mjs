import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

// The Registry advertising ban is retired. It existed for a Coinbase-era
// constraint; the operator confirmed on 2026-09-04 that the Registry may be
// advertised again. The positive assertion below is kept, because it guards a
// different thing: that the active surfaces still describe the distribution
// product at all.
test("active map and agent discovery still describe the distribution product", async () => {
  const [html, llms] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("llms.txt", root), "utf8"),
  ]);
  const activeMarketing = `${html}\n${llms}`;

  assert.match(activeMarketing, /delivery workflow for 100\+ DSPs/);
});

// /press is published as of 2026-09-04 - it is the page a host or journalist
// copies a bio from, and redirecting it away is why third parties wrote their
// own. /deck stays redirected; nobody asked for it back.
test("stale deck marketing redirects to the neutral status page", async () => {
  const [config, sitemap] = await Promise.all([
    readFile(new URL("vercel.json", root), "utf8"),
    readFile(new URL("sitemap.xml", root), "utf8"),
  ]);
  const redirects = JSON.parse(config).redirects;

  for (const source of [
    "/deck",
    "/deck/",
    "/deck/:path*",
  ]) {
    assert.deepEqual(
      redirects.find((redirect) => redirect.source === source),
      {
        source,
        destination: "https://suedeai.ai/proof-of-creation",
        permanent: false,
      },
    );
  }
  assert.doesNotMatch(sitemap, /\/deck\//);
  assert.match(sitemap, /\/press\//, "the press kit is published and must be in the sitemap");
});

test("no redirect hides the press kit", async () => {
  const config = await readFile(new URL("vercel.json", root), "utf8");
  const pressRedirect = JSON.parse(config).redirects.find((r) =>
    String(r.source).startsWith("/press"),
  );
  assert.equal(pressRedirect, undefined, "/press must not be redirected away");
});
