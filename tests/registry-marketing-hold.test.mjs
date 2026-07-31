import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("active map and agent discovery do not advertise the held Registry", async () => {
  const [html, llms] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("llms.txt", root), "utf8"),
  ]);
  const activeMarketing = `${html}\n${llms}`;

  assert.doesNotMatch(
    activeMarketing,
    /https:\/\/ip\.suedeai\.ai|\bIP Registry\b|Rights Passport|suedeai\.ai\/(?:vaults|royalties)|launch\.suedeai\.ai|rights protection built in/i,
  );
  assert.match(activeMarketing, /delivery workflow for 100\+ DSPs/);
});

test("stale press and deck marketing redirect to the neutral status page", async () => {
  const [config, sitemap] = await Promise.all([
    readFile(new URL("vercel.json", root), "utf8"),
    readFile(new URL("sitemap.xml", root), "utf8"),
  ]);
  const redirects = JSON.parse(config).redirects;

  for (const source of [
    "/press",
    "/press/",
    "/press/:path*",
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
  assert.doesNotMatch(sitemap, /\/press\/|\/deck\//);
});
