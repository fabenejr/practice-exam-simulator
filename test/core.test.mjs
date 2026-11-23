import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Core = require('../js/core.js');
const sample = require('../data/sample-bank.js');

// Deterministic pseudo random generator for shuffle tests.
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

const clone = (o) => JSON.parse(JSON.stringify(o));
const q = (id) => sample.questions.find((x) => x.id === id);

test('the bundled sample bank is valid', () => {
  const r = Core.validateBank(sample);
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
});

test('validateBank rejects malformed banks', () => {
  assert.equal(Core.validateBank(null).ok, false);
  assert.equal(Core.validateBank([]).ok, false);

  const noVersion = clone(sample); delete noVersion.schemaVersion;
  assert.equal(Core.validateBank(noVersion).ok, false);

  const unknownAnswer = clone(sample); unknownAnswer.questions[0].answer = ['Z'];
  assert.equal(Core.validateBank(unknownAnswer).ok, false);

  const dupId = clone(sample); dupId.questions[1].id = dupId.questions[0].id;
  assert.equal(Core.validateBank(dupId).ok, false);

  const badDomain = clone(sample); badDomain.questions[0].domain = 'nope';
  assert.equal(Core.validateBank(badDomain).ok, false);

  const singleTwo = clone(sample); singleTwo.questions[0].answer = ['A', 'B'];
  assert.equal(Core.validateBank(singleTwo).ok, false);

  const multipleOne = clone(sample);
  multipleOne.questions.find((x) => x.type === 'multiple').answer = ['A'];
  assert.equal(Core.validateBank(multipleOne).ok, false);
});

test('validateBank rejects reserved ids that could pollute objects', () => {
  const bad = clone(sample); bad.questions[0].id = '__proto__';
  assert.equal(Core.validateBank(bad).ok, false);
});

test('toggleSelection: single choice replaces, multiple keeps the newest N', () => {
  const single = q('1.1');
  assert.deepEqual(Core.toggleSelection(single, [], 'A'), ['A']);
  assert.deepEqual(Core.toggleSelection(single, ['A'], 'B'), ['B']);
  assert.deepEqual(Core.toggleSelection(single, ['B'], 'B'), []);

  const multi = q('4.2'); // needs 2
  assert.deepEqual(Core.toggleSelection(multi, [], 'A'), ['A']);
  assert.deepEqual(Core.toggleSelection(multi, ['A'], 'C'), ['A', 'C']);
  assert.deepEqual(Core.toggleSelection(multi, ['A', 'C'], 'D'), ['C', 'D']);
  assert.deepEqual(Core.toggleSelection(multi, ['A', 'C'], 'A'), ['C']);
});

test('isComplete and isCorrect ignore selection order', () => {
  const multi = q('4.2');
  assert.equal(Core.isComplete(multi, ['A']), false);
  assert.equal(Core.isComplete(multi, ['A', 'C']), true);
  assert.equal(Core.isCorrect(multi, ['C', 'A']), true);
  assert.equal(Core.isCorrect(multi, ['A', 'B']), false);
  assert.equal(Core.isCorrect(multi, ['A']), false);
  assert.equal(Core.isCorrect(q('1.1'), ['C']), true);
  assert.equal(Core.isCorrect(q('1.1'), []), false);
});

test('buildSession filters by domain, count and explicit ids', () => {
  const all = Core.buildSession(sample, {});
  assert.equal(all.length, sample.questions.length);

  const d2 = Core.buildSession(sample, { domains: ['d2'] });
  assert.deepEqual(d2.map((i) => i.qid), ['2.1', '2.2']);

  const limited = Core.buildSession(sample, { count: 5 });
  assert.equal(limited.length, 5);

  const only = Core.buildSession(sample, { only: ['8.2', '1.1'] });
  assert.deepEqual(only.map((i) => i.qid), ['1.1', '8.2']);
});

test('shuffling keeps the same questions and options', () => {
  const rng = seeded(42);
  const items = Core.buildSession(sample, { shuffleQuestions: true, shuffleOptions: true, rng });
  assert.deepEqual(items.map((i) => i.qid).sort(), sample.questions.map((x) => x.id).sort());
  for (const it of items) {
    const ids = q(it.qid).options.map((o) => o.id).sort();
    assert.deepEqual([...it.order].sort(), ids);
  }
});

test('score counts correct answers overall and per domain', () => {
  const items = Core.buildSession(sample, { domains: ['d1', 'd2'] });
  const answers = { '1.1': ['C'], '1.2': ['B'], '2.1': ['D'] };
  const r = Core.score(sample, items, answers);
  assert.equal(r.total, 4);
  assert.equal(r.answered, 3);
  assert.equal(r.correct, 2);
  assert.equal(r.pct, 0.5);
  const d1 = r.domains.find((d) => d.id === 'd1');
  assert.deepEqual([d1.correct, d1.total], [1, 2]);
  assert.equal(r.domains.find((d) => d.id === 'd3'), undefined);
});

test('formatClock', () => {
  assert.equal(Core.formatClock(0), '00:00');
  assert.equal(Core.formatClock(61000), '01:01');
  assert.equal(Core.formatClock(3661000), '1:01:01');
  assert.equal(Core.formatClock(-5), '00:00');
});
