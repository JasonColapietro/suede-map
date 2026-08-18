import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

// "Jay Colapietro" is NOT a declared alias. It was published across the estate by
// mistake and scrubbed from this repo's index.html in #9 — but that fix missed
// llms.txt, and this test still *required* the false name, so it went red on main
// instead of catching the gap. The assertions below now enforce the real canon:
// the only declared alias is "Johnny Suede".
const FALSE_ALIAS = "Jay Colapietro";

test("founder schema carries only the declared alias and identity links", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

  assert.ok(match, "expected JSON-LD in index.html");
  const schema = JSON.parse(match[1]);
  const founder = schema["@graph"].find(
    (entry) => entry["@id"] === "https://suedeai.ai/founder#person",
  );

  assert.ok(founder, "expected founder Person entity");
  assert.equal(founder.name, "Jason Colapietro");
  assert.deepEqual(founder.alternateName, ["Johnny Suede"]);
  assert.ok(founder.sameAs.includes("https://jasoncolapietro.com"));
  assert.ok(founder.sameAs.includes("https://johnnysuede.com"));
});

test("visible copy and LLM feed use the same two-name identity", async () => {
  const [html, llms] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("llms.txt", root), "utf8"),
  ]);

  for (const name of ["Jason Colapietro", "Johnny Suede"]) {
    assert.match(html, new RegExp(name));
    assert.match(llms, new RegExp(name));
  }

  assert.match(llms, /https:\/\/jasoncolapietro\.com/);
  assert.match(llms, /https:\/\/johnnysuede\.com/);
});

// Every artifact this repo actually serves, not just the two above — the #9 fix
// scrubbed index.html and stopped, so llms.txt kept asserting the false alias to
// answer engines for nine days. Assert on the served files.
test("no served artifact asserts the false alias", async () => {
  for (const file of ["index.html", "llms.txt", "robots.txt", "sitemap.xml", "README.md"]) {
    const contents = await readFile(new URL(file, root), "utf8");
    assert.ok(
      !contents.includes(FALSE_ALIAS),
      `${file} must not assert the false alias "${FALSE_ALIAS}"`,
    );
  }
});
