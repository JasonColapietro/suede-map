import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('current directory recognition preserves dated records', () => {
 const data=JSON.parse(readFileSync(new URL('../content/accomplishments.json',import.meta.url),'utf8'));
 assert.equal(data.records[0].title, 'Best Overall + Best API Option — AI Agents Directory, 52+ music tools');
 assert.equal(data.records[0].links[0].url, 'https://aiagentsdirectory.com/category/music');
 assert.ok(data.records.some(r => /among 47 tools/.test(r.body)));
});
