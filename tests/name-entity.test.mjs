import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("founder schema carries the confirmed public aliases and identity links", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

  assert.ok(match, "expected JSON-LD in index.html");
  const schema = JSON.parse(match[1]);
  const founder = schema["@graph"].find(
    (entry) => entry["@id"] === "https://suedeai.ai/founder#person",
  );

  assert.ok(founder, "expected founder Person entity");
  assert.equal(founder.name, "Jason Colapietro");
  assert.deepEqual(founder.alternateName, ["Jay Colapietro", "Johnny Suede"]);
  assert.ok(founder.sameAs.includes("https://jasoncolapietro.com"));
  assert.ok(founder.sameAs.includes("https://johnnysuede.com"));
});

test("visible copy and LLM feed use the same three-name identity", async () => {
  const [html, llms] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("llms.txt", root), "utf8"),
  ]);

  for (const name of ["Jason Colapietro", "Jay Colapietro", "Johnny Suede"]) {
    assert.match(html, new RegExp(name));
    assert.match(llms, new RegExp(name));
  }

  assert.match(llms, /https:\/\/jasoncolapietro\.com/);
  assert.match(llms, /https:\/\/johnnysuede\.com/);
});
