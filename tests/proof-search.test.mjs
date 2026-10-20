import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const sources = ["content/accomplishments.json","index.html","press/index.html","llms.txt","llms-full.txt"];
const files = (entry) => {
  const location = path.join(root, entry);
  return statSync(location).isDirectory()
    ? readdirSync(location).flatMap((name) => files(path.join(entry, name)))
    : /\.(?:html|txt|json)$/.test(entry) ? [entry] : [];
};

test('merged contribution proof searches cover both verified author accounts', () => {
  let searches = 0;
  for (const file of sources.flatMap(files)) {
    const content = readFileSync(path.join(root, file), 'utf8');
    for (const [raw] of content.matchAll(/https:\/\/github\.com\/search\?[^\s"'<>\\)]+/g)) {
      const query = new URL(raw.replaceAll('&amp;', '&')).searchParams.get('q') ?? '';
      const terms = query.replaceAll(/[()]/g, ' ').trim().split(/\s+/);
      const authors = terms.filter((term) => term.startsWith('author:')).sort();
      if (!authors.some((term) => ['author:JasonColapietro', 'author:Suede-AI'].includes(term))) continue;
      searches++;
      assert.deepEqual(authors, ['author:JasonColapietro', 'author:Suede-AI'],
        `${file}: the 54-PR record includes contributions from both verified accounts`);
      for (const term of ['is:pr', 'is:merged', '-user:JasonColapietro', '-user:Suede-AI']) {
        assert.ok(terms.includes(term), `${file}: proof search is missing ${term}`);
      }
    }
  }
  assert.ok(searches > 0, 'Expected at least one merged-contribution proof search');
});

