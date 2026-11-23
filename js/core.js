/*
 * Core logic of the simulator: bank validation, session building, grading.
 * Pure functions with no DOM access, so they run in the browser and in Node (tests, CI).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CCDVCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_ERRORS = 50;
  const FORBIDDEN_ID = /^(__proto__|constructor|prototype)$/;
  const SAFE_BANK_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

  /** Validates a question bank (schema version 1). Returns { ok, errors }. */
  function validateBank(bank) {
    const errors = [];
    const err = (msg) => { if (errors.length < MAX_ERRORS) errors.push(msg); };

    if (!isObj(bank)) return { ok: false, errors: ['The bank must be a JSON object.'] };

    if (bank.schemaVersion !== 1) err('schemaVersion must be 1.');
    if (!isStr(bank.id) || !SAFE_BANK_ID.test(bank.id)) {
      err('id must be 1-64 characters: letters, digits, dot, dash or underscore.');
    }
    if (!isStr(bank.title)) err('title is required.');
    if (bank.passThreshold !== undefined &&
        !(typeof bank.passThreshold === 'number' && bank.passThreshold > 0 && bank.passThreshold <= 1)) {
      err('passThreshold must be a number greater than 0 and at most 1.');
    }
    if (bank.timeLimitMinutes !== undefined &&
        !(Number.isInteger(bank.timeLimitMinutes) && bank.timeLimitMinutes >= 0 && bank.timeLimitMinutes <= 600)) {
      err('timeLimitMinutes must be an integer between 0 and 600.');
    }

    const domainIds = Object.create(null);
    if (!Array.isArray(bank.domains) || bank.domains.length === 0) {
      err('domains must be a non-empty array.');
    } else {
      bank.domains.forEach((d, i) => {
        const p = 'domains[' + i + ']';
        if (!isObj(d)) return err(p + ' must be an object.');
        if (!isStr(d.id) || FORBIDDEN_ID.test(d.id)) err(p + '.id is required and must not be a reserved word.');
        else if (domainIds[d.id]) err(p + '.id "' + d.id + '" is duplicated.');
        else domainIds[d.id] = true;
        if (!isStr(d.name)) err(p + '.name is required.');
        if (d.weight !== undefined && !(typeof d.weight === 'number' && d.weight >= 0)) {
          err(p + '.weight must be a number >= 0.');
        }
      });
    }

    const questionIds = Object.create(null);
    if (!Array.isArray(bank.questions) || bank.questions.length === 0) {
      err('questions must be a non-empty array.');
    } else {
      bank.questions.forEach((q, i) => {
        const p = 'questions[' + i + ']';
        if (!isObj(q)) return err(p + ' must be an object.');

        if (!isStr(q.id) || FORBIDDEN_ID.test(q.id)) err(p + '.id is required and must not be a reserved word.');
        else if (questionIds[q.id]) err(p + '.id "' + q.id + '" is duplicated.');
        else questionIds[q.id] = true;

        if (!isStr(q.domain) || !domainIds[q.domain]) err(p + '.domain must match a domain id.');
        if (q.type !== 'single' && q.type !== 'multiple') err(p + '.type must be "single" or "multiple".');
        if (!isStr(q.question)) err(p + '.question is required.');
        if (q.explanation !== undefined && typeof q.explanation !== 'string') err(p + '.explanation must be a string.');

        const optionIds = Object.create(null);
        let optionCount = 0;
        if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 8) {
          err(p + '.options must have between 2 and 8 items.');
        } else {
          q.options.forEach((o, j) => {
            const op = p + '.options[' + j + ']';
            if (!isObj(o) || !isStr(o.id) || !isStr(o.text) || FORBIDDEN_ID.test(o.id)) {
              return err(op + ' needs a valid id and a text.');
            }
            if (optionIds[o.id]) return err(op + '.id "' + o.id + '" is duplicated.');
            optionIds[o.id] = true;
            optionCount++;
          });
        }

        if (!Array.isArray(q.answer) || q.answer.length === 0) {
          err(p + '.answer must be a non-empty array of option ids.');
        } else {
          const seen = Object.create(null);
          q.answer.forEach((a) => {
            if (!optionIds[a]) err(p + '.answer has unknown option id "' + String(a) + '".');
            if (seen[a]) err(p + '.answer repeats "' + String(a) + '".');
            seen[a] = true;
          });
          if (q.type === 'single' && q.answer.length !== 1) err(p + ' type "single" needs exactly one answer.');
          if (q.type === 'multiple' && (q.answer.length < 2 || (optionCount && q.answer.length >= optionCount))) {
            err(p + ' type "multiple" needs at least 2 answers and fewer than the number of options.');
          }
        }
      });
    }

    return { ok: errors.length === 0, errors };
  }

  /** Fisher-Yates shuffle returning a new array. `rng` returns a number in [0, 1). */
  function shuffle(arr, rng) {
    const r = rng || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** How many options the learner must pick for this question. */
  const needCount = (q) => q.answer.length;

  /**
   * Builds the ordered list of items for a session.
   * opts: { domains?: string[], only?: string[], count?: number, shuffleQuestions?: boolean,
   *         shuffleOptions?: boolean, rng?: () => number }
   * Returns [{ qid, order: optionId[] }].
   */
  function buildSession(bank, opts) {
    const o = opts || {};
    const rng = o.rng || Math.random;
    let pool = bank.questions.filter((q) => {
      if (o.only) return o.only.indexOf(q.id) !== -1;
      return !o.domains || o.domains.indexOf(q.domain) !== -1;
    });
    if (o.shuffleQuestions) pool = shuffle(pool, rng);
    if (o.count > 0 && o.count < pool.length) pool = pool.slice(0, o.count);
    return pool.map((q) => {
      const ids = q.options.map((opt) => opt.id);
      return { qid: q.id, order: o.shuffleOptions ? shuffle(ids, rng) : ids };
    });
  }

  /** Returns the new selection after the learner clicks an option. */
  function toggleSelection(q, selected, optionId) {
    const need = needCount(q);
    const cur = selected.slice();
    const pos = cur.indexOf(optionId);
    if (pos !== -1) { cur.splice(pos, 1); return cur; }
    if (need === 1) return [optionId];
    cur.push(optionId);
    if (cur.length > need) cur.shift();
    return cur;
  }

  const isComplete = (q, selected) => selected.length === needCount(q);

  function isCorrect(q, selected) {
    if (selected.length !== q.answer.length) return false;
    return q.answer.every((a) => selected.indexOf(a) !== -1);
  }

  /** Scores a session. answers: { [questionId]: optionId[] }. */
  function score(bank, items, answers) {
    const qMap = new Map(bank.questions.map((q) => [q.id, q]));
    const dom = new Map(bank.domains.map((d) => [d.id, { id: d.id, name: d.name, correct: 0, total: 0 }]));
    let correct = 0;
    let answered = 0;
    items.forEach((it) => {
      const q = qMap.get(it.qid);
      if (!q) return;
      const sel = answers[it.qid] || [];
      const d = dom.get(q.domain);
      d.total++;
      if (sel.length) answered++;
      if (isCorrect(q, sel)) { correct++; d.correct++; }
    });
    const total = items.length;
    return {
      correct,
      answered,
      total,
      pct: total ? correct / total : 0,
      domains: [...dom.values()]
        .filter((d) => d.total > 0)
        .map((d) => Object.assign({}, d, { pct: d.correct / d.total }))
    };
  }

  /** Formats milliseconds as mm:ss or hh:mm:ss. */
  function formatClock(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const hh = Math.floor(s / 3600);
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return hh > 0 ? hh + ':' + mm + ':' + ss : mm + ':' + ss;
  }

  return { validateBank, shuffle, needCount, buildSession, toggleSelection, isComplete, isCorrect, score, formatClock };
});
