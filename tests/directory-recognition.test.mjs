import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('current directory recognition preserves dated records', () => {
 const data=JSON.parse(readFileSync(new URL('../content/accomplishments.json',import.meta.url),'utf8'));
 // Identity spec v2 (2026-10-19) puts the founder's record first, so the dated
 // directory record is found by id rather than by position.
 const current=data.records.find(r => r.id === 'directory-recognition-current');
 assert.ok(current);
 assert.equal(current.title, 'Best Overall + Best API Option — AI Agents Directory, 52+ music tools');
 assert.equal(current.links[0].url, 'https://aiagentsdirectory.com/category/music');
 assert.ok(data.records.some(r => /among 47 tools/.test(r.body)));
});
