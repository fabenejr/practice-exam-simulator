/*
 * UI layer. All text from question banks is inserted with textContent / text nodes only
 * (never innerHTML), because imported banks are untrusted input.
 */
(function () {
  'use strict';

  const Core = window.CCDVCore;
  const I18N = window.CCDVi18n;
  const t = I18N.t;

  const STORE_KEY = 'ccdv-sim:session:v2';
  const THEME_KEY = 'ccdv-sim:theme';
  const BANKS_KEY = 'ccdv-sim:banks:v1'; // question sets imported by the user, kept in this browser only
  const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
  const LETTERS = 'ABCDEFGH';
  const root = document.getElementById('app');

  const banks = new Map();
  const ui = { view: 'setup', bankId: null, notice: null, filter: 'all', form: null, open: new Set() };
  let session = null; // { bankId, mode, items, answers, marked, idx, startedAt, deadline, finishedAt, opts }
  let ctx = null;     // { bank, qMap } for the bank of the current session
  let timerId = null;

  /* ---------- helpers ---------- */

  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } };

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid);
    return el;
  }

  // variants: primary | secondary (outline) | on (marked); anything after the variant is passed through as extra classes
  const VARIANTS = { primary: 'btn-primary', secondary: 'btn-outline-secondary', on: 'btn-warning' };
  const btn = (text, onclick, cls, extra) => {
    const [variant, ...rest] = (cls || 'secondary').split(' ');
    return h('button', Object.assign({ type: 'button', class: ['btn', VARIANTS[variant] || VARIANTS.secondary].concat(rest).join(' '), onclick, text }, extra || {}));
  };

  function registerBank(bank) {
    const v = Core.validateBank(bank);
    if (v.ok) banks.set(bank.id, bank);
    return v;
  }

  const imported = new Set(); // ids of banks that came from an import (can be removed)

  function loadImported() {
    try {
      const saved = JSON.parse(lsGet(BANKS_KEY) || '{}');
      Object.values(saved).forEach((b) => { if (registerBank(b).ok) imported.add(b.id); });
    } catch (e) { /* corrupt data: ignore */ }
  }

  function saveImported(bank) {
    let saved = {};
    try { saved = JSON.parse(lsGet(BANKS_KEY) || '{}') || {}; } catch (e) { /* start fresh */ }
    saved[bank.id] = bank;
    lsSet(BANKS_KEY, JSON.stringify(saved));
    imported.add(bank.id);
  }

  function removeImported(id) {
    if (!window.confirm(t('confirmRemoveSet'))) return;
    let saved = {};
    try { saved = JSON.parse(lsGet(BANKS_KEY) || '{}') || {}; } catch (e) { /* nothing saved */ }
    delete saved[id];
    lsSet(BANKS_KEY, JSON.stringify(saved));
    imported.delete(id);
    banks.delete(id);
    ui.bankId = banks.size ? [...banks.keys()][0] : null;
    resetForm();
    render();
  }

  function useBank(id) {
    const bank = banks.get(id);
    ctx = bank ? { bank, qMap: new Map(bank.questions.map((q) => [q.id, q])) } : null;
    return ctx;
  }

  const optionOf = (q, id) => q.options.find((o) => o.id === id);
  const lettersFor = (item, ids) =>
    ids.map((id) => LETTERS[item.order.indexOf(id)]).filter(Boolean).sort().join(', ');
  const statusOf = (q, sel) => (!sel.length ? 'blank' : Core.isCorrect(q, sel) ? 'ok' : 'bad');
  const isRevealed = (q) =>
    !!session.finishedAt || (session.mode === 'study' && Core.isComplete(q, session.answers[q.id] || []));

  function persist() { if (session) lsSet(STORE_KEY, JSON.stringify(session)); }

  function resetForm() {
    const bank = banks.get(ui.bankId);
    ui.form = {
      mode: 'study',
      domains: bank ? bank.domains.map((d) => d.id) : [],
      count: '',
      shuffleQ: false,
      shuffleO: false,
      minutes: bank && bank.timeLimitMinutes !== undefined ? bank.timeLimitMinutes : 120
    };
  }

  /* ---------- session lifecycle ---------- */

  function startSession(opts, bankId) {
    const bank = banks.get(bankId || ui.bankId);
    const items = Core.buildSession(bank, opts);
    if (!items.length) { ui.notice = { kind: 'error', text: t('noQuestions') }; return render(); }
    const now = Date.now();
    const minutes = opts.mode === 'exam' ? opts.minutes || 0 : 0;
    session = {
      bankId: bank.id,
      mode: opts.mode,
      items,
      answers: {},
      marked: {},
      idx: 0,
      startedAt: now,
      deadline: minutes > 0 ? now + minutes * 60000 : null,
      finishedAt: null,
      opts: { shuffleOptions: !!opts.shuffleOptions, minutes }
    };
    persist();
    ui.bankId = bank.id;
    ui.view = 'quiz';
    render({ focus: 'q' });
  }

  function restore() {
    try {
      const s = JSON.parse(lsGet(STORE_KEY) || 'null');
      const ok = s && typeof s.bankId === 'string' && Array.isArray(s.items) &&
        s.items.every((it) => it && typeof it.qid === 'string' && Array.isArray(it.order)) &&
        s.answers && typeof s.answers === 'object' && Number.isInteger(s.idx);
      if (ok) { s.marked = s.marked || {}; s.opts = s.opts || {}; session = s; }
    } catch (e) { /* corrupt data: ignore */ }
  }

  function resumeSession() {
    if (!useBank(session.bankId)) { ui.notice = { kind: 'error', text: t('bankMissing') }; return render(); }
    const { qMap } = ctx;
    session.items = session.items.filter((it) => qMap.has(it.qid)).map((it) => {
      const q = qMap.get(it.qid);
      const valid = it.order.length === q.options.length && q.options.every((o) => it.order.includes(o.id));
      return valid ? it : { qid: it.qid, order: q.options.map((o) => o.id) };
    });
    if (!session.items.length) return discardSession();
    session.idx = Math.min(Math.max(0, session.idx), session.items.length - 1);
    ui.view = 'quiz';
    render({ focus: 'q' });
  }

  function discardSession() {
    lsDel(STORE_KEY);
    session = null;
    ui.view = 'setup';
    render();
  }

  function finishSession() {
    session.finishedAt = Date.now();
    persist();
    ui.view = 'results';
    ui.filter = 'all';
    ui.open.clear();
    render();
  }

  function confirmFinish() {
    const blank = session.items.filter((it) => !(session.answers[it.qid] || []).length).length;
    if (window.confirm(blank ? t('confirmFinishBlank', { n: blank }) : t('confirmFinish'))) finishSession();
  }

  function quitSession() {
    if (window.confirm(t('confirmQuit'))) discardSession();
  }

  function retryWrong() {
    const ids = session.items
      .filter((it) => statusOf(ctx.qMap.get(it.qid), session.answers[it.qid] || []) !== 'ok')
      .map((it) => it.qid);
    if (!ids.length) { ui.notice = { kind: 'ok', text: t('nothingToRetry') }; return render(); }
    startSession(
      { mode: session.mode, only: ids, shuffleOptions: session.opts.shuffleOptions, minutes: session.opts.minutes },
      session.bankId
    );
  }

  function choose(q, optionId, i) {
    if (session.finishedAt || isRevealed(q)) return;
    const next = Core.toggleSelection(q, session.answers[q.id] || [], optionId);
    if (next.length) session.answers[q.id] = next; else delete session.answers[q.id];
    persist();
    render({ focus: { opt: i } });
  }

  function go(i) {
    if (!session || i < 0 || i >= session.items.length) return;
    session.idx = i;
    persist();
    render({ focus: 'q' });
  }

  function toggleMark(qid) {
    if (session.marked[qid]) delete session.marked[qid]; else session.marked[qid] = true;
    persist();
    render();
  }

  function exportResults() {
    const { bank, qMap } = ctx;
    const res = Core.score(bank, session.items, session.answers);
    const data = {
      bank: { id: bank.id, title: bank.title },
      mode: session.mode,
      startedAt: new Date(session.startedAt).toISOString(),
      finishedAt: new Date(session.finishedAt).toISOString(),
      score: { correct: res.correct, total: res.total, percent: Math.round(res.pct * 1000) / 10 },
      questions: session.items.map((it) => {
        const sel = session.answers[it.qid] || [];
        return { id: it.qid, selected: sel, correct: Core.isCorrect(qMap.get(it.qid), sel) };
      })
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = h('a', { href: url, download: 'results-' + bank.id + '.json' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- timer ---------- */

  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }

  function tick() {
    const el = document.getElementById('timer');
    if (!el || !session || session.finishedAt) return;
    const now = Date.now();
    if (session.deadline) {
      const left = session.deadline - now;
      if (left <= 0) { ui.notice = { kind: 'ok', text: t('timeUp') }; finishSession(); return; }
      el.textContent = Core.formatClock(left);
    } else {
      el.textContent = Core.formatClock(now - session.startedAt);
    }
  }

  function startTimer() { tick(); timerId = setInterval(tick, 500); }

  /* ---------- import ---------- */

  async function importFile(file) {
    if (file.size > MAX_IMPORT_BYTES) { ui.notice = { kind: 'error', text: t('tooBig') }; return render(); }
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) { ui.notice = { kind: 'error', text: t('invalidJson') }; return render(); }
    const v = registerBank(data);
    if (!v.ok) { ui.notice = { kind: 'error', text: t('importFail'), list: v.errors.slice(0, 10) }; return render(); }
    saveImported(data);
    ui.bankId = data.id;
    ui.view = session && session.finishedAt ? ui.view : 'setup';
    resetForm();
    ui.notice = { kind: 'ok', text: t('importOk', { title: data.title }) };
    render();
  }

  /* ---------- views ---------- */

  function renderHeader() {
    const quiz = ui.view === 'quiz' && session && ctx;
    const langSelect = h('select', {
      id: 'lang', class: 'form-select form-select-sm w-auto',
      onchange: (e) => { I18N.setLang(e.target.value); document.documentElement.lang = I18N.getLang(); render(); }
    }, I18N.langs.map((l) => h('option', { value: l.code, selected: l.code === I18N.getLang(), text: l.label })));
    const total = quiz ? session.items.length : 0;
    const answeredN = quiz ? Object.keys(session.answers).length : 0;
    const title = ui.view !== 'setup' && ctx ? t('appTitle') + ' — ' + ctx.bank.title : t('appTitle');

    return h('header', { class: 'appbar sticky-top' },
      h('div', { class: 'container-xxl d-flex flex-wrap align-items-center gap-2 gap-md-3 py-2' },
        h('h1', { class: 'h6 fw-bold mb-0 me-auto brand', text: title }),
        quiz ? h('span', { class: 'text-body-secondary small', text: t('answered', { n: answeredN, total }) }) : null,
        quiz ? h('span', { id: 'timer', class: 'timer', role: 'timer', 'aria-live': 'off', text: '--:--' }) : null,
        quiz ? btn(t('quit'), quitSession, 'secondary') : null,
        quiz ? btn(t('finish'), confirmFinish, 'primary') : null,
        h('label', { class: 'visually-hidden', for: 'lang', text: t('language') }),
        langSelect,
        btn('◐', toggleTheme, 'secondary', { title: t('theme'), 'aria-label': t('theme') })),
      quiz ? h('div', { class: 'progress rounded-0', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': answeredN },
        h('div', { class: 'progress-bar', style: 'width:' + Math.round((answeredN / total) * 100) + '%' })) : null);
  }

  function noticeEl() {
    if (!ui.notice) return null;
    const n = ui.notice;
    ui.notice = null;
    return h('div', { class: 'container-xxl pt-3' },
      h('div', { class: 'alert mb-0 alert-' + (n.kind === 'error' ? 'danger' : 'success'), role: n.kind === 'error' ? 'alert' : 'status' },
        h('p', { class: 'mb-0', text: n.text }),
        n.list ? h('ul', { class: 'mb-0 mt-2 small' }, n.list.map((m) => h('li', { text: m }))) : null));
  }

  function importControl() {
    return h('div', { class: 'import d-flex flex-wrap align-items-center gap-2 my-3' },
      h('input', {
        type: 'file', accept: '.json,application/json', class: 'visually-hidden', id: 'file',
        onchange: (e) => { const f = e.target.files[0]; if (f) importFile(f); e.target.value = ''; }
      }),
      h('label', { class: 'btn btn-outline-secondary', for: 'file', text: t('importBank') }),
      h('span', { class: 'text-body-secondary small', text: t('dropHint') }));
  }

  function renderSetup() {
    const bank = banks.get(ui.bankId);
    const saved = session && !session.finishedAt ? session : null;
    const side = [h('div', { class: 'cover' }, h('h2', { text: t('setupTitle') }), h('p', { class: 'lede', text: t('setupLede') }))];

    if (saved) {
      const sb = banks.get(saved.bankId);
      side.push(h('section', { class: 'card resume mb-3' }, h('div', { class: 'card-body' },
        h('h3', { class: 'h6', text: t('resumeTitle') }),
        h('p', { text: t('resumeInfo', { bank: sb ? sb.title : saved.bankId, done: Object.keys(saved.answers).length, total: saved.items.length }) }),
        h('div', { class: 'd-flex gap-2' }, btn(t('resume'), resumeSession, 'primary'), btn(t('discard'), discardSession, 'secondary')))));
    }

    side.push(importControl());
    const sideEl = h('div', { class: 'col-lg-5 setup-side' }, side);
    if (!bank) {
      side.push(h('p', { class: 'text-body-secondary', text: t('noBank') }));
      return [h('div', { class: 'row g-4' }, sideEl)];
    }

    const f = ui.form;
    const radio = (value, label) => h('label', { class: 'form-check' },
      h('input', { class: 'form-check-input', type: 'radio', name: 'mode', value, checked: f.mode === value, onchange: () => { f.mode = value; render(); } }),
      h('span', { class: 'form-check-label', text: label }));
    const check = (key, label) => h('label', { class: 'form-check' },
      h('input', { class: 'form-check-input', type: 'checkbox', checked: f[key], onchange: (e) => { f[key] = e.target.checked; } }),
      h('span', { class: 'form-check-label', text: label }));
    const pair = (id, label, attrs) => h('div', { class: 'row g-2 align-items-center mb-2' },
      h('label', { class: 'col col-form-label', for: id, text: label }),
      h('div', { class: 'col-auto' }, h('input', Object.assign({ id, type: 'number', class: 'form-control num' }, attrs))));
    const group = (legend, ...kids) => h('fieldset', { class: 'field' }, h('legend', { class: 'field-title', text: legend }), kids);

    const form = h('section', { class: 'card col-lg-7 form' },
      h('div', { class: 'field' },
        h('label', { class: 'field-title', for: 'bank', text: t('bank') }),
        h('select', { id: 'bank', class: 'form-select', onchange: (e) => { ui.bankId = e.target.value; resetForm(); render(); } },
          [...banks.values()].map((b) => h('option', { value: b.id, selected: b.id === ui.bankId, text: b.title }))),
        h('p', { class: 'hint', text: [bank.description, t('bankInfo', { n: bank.questions.length, d: bank.domains.length })].filter(Boolean).join('. ') }),
        h('p', { class: 'hint', text: t('bankHelp') }),
        imported.has(bank.id) ? btn(t('removeSet'), () => removeImported(bank.id), 'secondary btn-sm mt-2') : null),

      group(t('mode'), radio('study', t('modeStudy')), radio('exam', t('modeExam'))),

      group(t('domains'), bank.domains.map((d) => {
        const n = bank.questions.filter((q) => q.domain === d.id).length;
        return h('label', { class: 'form-check' },
          h('input', {
            class: 'form-check-input', type: 'checkbox', checked: f.domains.includes(d.id), disabled: n === 0,
            onchange: (e) => { f.domains = e.target.checked ? f.domains.concat(d.id) : f.domains.filter((x) => x !== d.id); }
          }),
          h('span', { class: 'form-check-label', text: d.name + ' (' + n + ')' }));
      })),

      group(t('options'),
        pair('count', t('count'), { min: 1, max: bank.questions.length, value: f.count, oninput: (e) => { f.count = e.target.value; } }),
        f.mode === 'exam' ? pair('minutes', t('timeLimit'), { min: 0, max: 600, value: f.minutes, oninput: (e) => { f.minutes = e.target.value; } }) : null,
        check('shuffleQ', t('shuffleQ')),
        check('shuffleO', t('shuffleO'))),

      h('div', { class: 'actions' }, btn(t('start'), () => {
        const count = parseInt(f.count, 10);
        startSession({
          mode: f.mode,
          domains: f.domains,
          count: count > 0 ? count : 0,
          shuffleQuestions: f.shuffleQ,
          shuffleOptions: f.shuffleO,
          minutes: Math.max(0, parseInt(f.minutes, 10) || 0)
        });
      }, 'primary btn-lg w-100')));

    return [h('div', { class: 'row g-4' }, sideEl, form)];
  }

  /* sidebar with the numbered question squares; used by quiz and results */
  function navigator(onPick, isFinalView) {
    const { qMap } = ctx;
    const total = session.items.length;
    const nav = h('nav', { class: 'qnav', 'aria-label': t('navLabel') },
      session.items.map((it, i) => {
        const qq = qMap.get(it.qid);
        const s = session.answers[it.qid] || [];
        let cls = 'qbtn' + (s.length ? ' answered' : '') + (session.marked[it.qid] ? ' marked' : '') + (!isFinalView && i === session.idx ? ' current' : '');
        if (s.length && isRevealed(qq)) cls += Core.isCorrect(qq, s) ? ' ok' : ' bad';
        else if (isFinalView && !s.length) cls += ' blank';
        return h('button', {
          type: 'button', class: cls, 'aria-current': !isFinalView && i === session.idx ? 'true' : null,
          'aria-label': t('questionOf', { n: i + 1, total }), onclick: () => onPick(i, it), text: i + 1
        });
      }));
    const legend = isFinalView
      ? [['ok', t('statusOk')], ['bad', t('statusBad')], ['blank', t('statusBlank')], ['marked', t('filterMarked')]]
      : [['answered', t('legendAnswered')], ['marked', t('marked')]];
    return h('aside', { class: 'card side' }, h('div', { class: 'card-body' }, nav,
      h('div', { class: 'legend' }, legend.map(([k, label]) => h('span', {}, h('i', { class: 'sw ' + k }), label)))));
  }

  function renderQuiz() {
    const { qMap } = ctx;
    const total = session.items.length;
    const item = session.items[session.idx];
    const q = qMap.get(item.qid);
    const sel = session.answers[q.id] || [];
    const need = Core.needCount(q);
    const revealed = isRevealed(q);

    const options = h('div', { class: 'opts', role: need === 1 ? 'radiogroup' : 'group', 'aria-labelledby': 'qtext' },
      item.order.map((oid, i) => {
        const o = optionOf(q, oid);
        const picked = sel.includes(oid);
        const right = q.answer.includes(oid);
        let cls = 'opt' + (picked ? ' sel' : '');
        if (revealed) cls += right ? ' right' : picked ? ' wrong' : '';
        return h('button', {
          type: 'button', class: cls, 'data-opt': i,
          role: need === 1 ? 'radio' : 'checkbox', 'aria-checked': picked ? 'true' : 'false',
          'aria-disabled': revealed ? 'true' : null,
          onclick: () => choose(q, oid, i)
        },
          h('span', { class: 'k', 'aria-hidden': 'true', text: LETTERS[i] }),
          h('span', { class: 'otext', text: o.text }),
          revealed && right ? h('span', { class: 'mark ok' }, '✓', h('span', { class: 'visually-hidden', text: t('statusOk') })) : null,
          revealed && picked && !right ? h('span', { class: 'mark bad' }, '✗', h('span', { class: 'visually-hidden', text: t('statusBad') })) : null);
      }));

    let feedback = null;
    if (revealed) {
      const ok = Core.isCorrect(q, sel);
      feedback = h('div', { class: 'alert mt-3 mb-0 alert-' + (ok ? 'success' : 'danger'), role: 'status' },
        h('strong', { text: ok ? '✓ ' + t('correct') : '✗ ' + t('incorrect', { ans: lettersFor(item, q.answer) }) }),
        q.explanation ? h('p', { class: 'expl mb-0 mt-2' }, h('b', { text: t('explanation') + ':' }), ' ' + q.explanation) : null);
    }

    return [h('div', { class: 'row g-3 quiz' },
      h('div', { class: 'col-lg-3' }, navigator((i) => go(i), false)),
      h('div', { class: 'col-lg-9' },
        h('section', { class: 'card question' }, h('div', { class: 'card-body' },
          h('div', { class: 'qhead' },
            h('p', { class: 'qnum mb-0' },
              h('span', { class: 'visually-hidden', text: t('questionOf', { n: session.idx + 1, total }) }),
              h('span', { 'aria-hidden': 'true', text: String(session.idx + 1) }),
              h('span', { class: 'qof', 'aria-hidden': 'true', text: t('ofTotal', { total }) })),
            h('p', { class: 'domain mb-0', text: (ctx.bank.domains.find((d) => d.id === q.domain) || {}).name || q.domain }),
            h('span', { class: 'qref', text: q.id })),
          h('p', { class: 'chip', text: need === 1 ? t('chooseOne') : t('chooseN', { n: need }) }),
          h('p', { id: 'qtext', class: 'qtext', tabindex: -1, text: q.question }),
          options,
          feedback,
          h('div', { class: 'd-flex flex-wrap justify-content-between gap-2 mt-4' },
            btn(t('prev'), () => go(session.idx - 1), 'secondary', { disabled: session.idx === 0 }),
            btn(session.marked[q.id] ? '✓ ' + t('marked') : t('mark'), () => toggleMark(q.id), session.marked[q.id] ? 'on' : 'secondary', { 'aria-pressed': session.marked[q.id] ? 'true' : 'false' }),
            btn(t('next'), () => go(session.idx + 1), 'primary', { disabled: session.idx === total - 1 })),
          h('p', { class: 'text-body-secondary small mt-3 mb-0', text: t('shortcuts') })))))];
  }

  function reviewDetail(it) {
    const { qMap } = ctx;
    const q = qMap.get(it.qid);
    const sel = session.answers[q.id] || [];
    return h('div', { class: 'rev-detail' },
      h('p', { class: 'qtext', text: q.question }),
      h('div', { class: 'opts' }, it.order.map((oid, i) => {
        const picked = sel.includes(oid);
        const right = q.answer.includes(oid);
        return h('div', { class: 'opt static' + (picked ? ' sel' : '') + (right ? ' right' : picked ? ' wrong' : '') },
          h('span', { class: 'k', 'aria-hidden': 'true', text: LETTERS[i] }),
          h('span', { class: 'otext', text: optionOf(q, oid).text }),
          right ? h('span', { class: 'mark ok' }, '✓', h('span', { class: 'visually-hidden', text: t('statusOk') })) : null,
          picked && !right ? h('span', { class: 'mark bad' }, '✗', h('span', { class: 'visually-hidden', text: t('statusBad') })) : null);
      })),
      q.explanation ? h('p', { class: 'expl mt-3 mb-0' }, h('b', { text: t('explanation') + ':' }), ' ' + q.explanation) : null);
  }

  function renderResults() {
    const { bank, qMap } = ctx;
    const res = Core.score(bank, session.items, session.answers);
    const thr = typeof bank.passThreshold === 'number' ? bank.passThreshold : 0.75;
    const thrPct = Math.round(thr * 100);
    const pct = Math.round(res.pct * 100);
    const blankN = session.items.filter((it) => !(session.answers[it.qid] || []).length).length;
    const elapsed = Math.max(0, Math.round(((session.finishedAt || Date.now()) - session.startedAt) / 60000));

    const filters = [['all', 'filterAll'], ['wrong', 'filterWrong'], ['blank', 'filterBlank'], ['marked', 'filterMarked']];
    const rows = session.items.map((it, i) => ({ it, n: i + 1 })).filter(({ it }) => {
      const st = statusOf(qMap.get(it.qid), session.answers[it.qid] || []);
      if (ui.filter === 'wrong') return st === 'bad';
      if (ui.filter === 'blank') return st === 'blank';
      if (ui.filter === 'marked') return !!session.marked[it.qid];
      return true;
    });

    const body = [];
    rows.forEach(({ it, n }) => {
      const q = qMap.get(it.qid);
      const sel = session.answers[q.id] || [];
      const st = statusOf(q, sel);
      const open = ui.open.has(it.qid);
      body.push(h('tr', { id: 'r-' + it.qid, class: 'rev-row' },
        h('td', {}, h('button', {
          type: 'button', class: 'btn btn-link p-0 rev-toggle', 'aria-expanded': open ? 'true' : 'false',
          onclick: () => { if (open) ui.open.delete(it.qid); else ui.open.add(it.qid); render(); },
          text: (open ? '▾ ' : '▸ ') + q.id
        })),
        h('td', { text: sel.length ? lettersFor(it, sel) : t('blank') }),
        h('td', { class: 'fw-bold', text: lettersFor(it, q.answer) }),
        h('td', { class: 'text-end' }, h('span', { class: 'badge-st ' + st, text: t(st === 'ok' ? 'statusOk' : st === 'bad' ? 'statusBad' : 'statusBlank') }))));
      if (open) body.push(h('tr', { class: 'rev-open' }, h('td', { colspan: 4 }, reviewDetail(it))));
    });

    const pickFromNav = (i, it) => {
      ui.filter = 'all';
      ui.open.add(it.qid);
      render({ scroll: 'r-' + it.qid });
    };

    return [h('div', { class: 'row g-3' },
      h('div', { class: 'col-lg-3' }, navigator(pickFromNav, true)),
      h('div', { class: 'col-lg-9' },
        h('section', { class: 'card' }, h('div', { class: 'card-body' },
          h('h2', { class: 'h4 fw-bold', text: t('results') }),
          h('p', { class: 'score', text: res.correct + '/' + res.total + ' (' + pct + '%)' }),
          h('p', { class: res.pct >= thr ? 'okc' : 'badc', text: t(res.pct >= thr ? 'aboveTarget' : 'belowTarget', { pct: thrPct }) }),
          h('p', { class: 'text-body-secondary small', text: t('summaryLine', { answered: res.total - blankN, blank: blankN, min: elapsed }) }),
          h('h3', { class: 'h6 fw-bold mt-4', text: t('byDomain') + ' (' + t('target') + ' ≈ ' + thrPct + '%)' }),
          res.domains.map((d) => h('div', { class: 'dom' },
            h('span', { text: d.name }),
            h('div', { class: 'track' },
              h('div', { class: 'fill' + (d.pct < thr ? ' low' : ''), style: 'width:' + Math.round(d.pct * 100) + '%' }),
              h('i', { class: 'thr', style: 'left:' + thrPct + '%' })),
            h('span', { class: 'text-end', text: d.correct + '/' + d.total }))),
          h('div', { class: 'd-flex flex-wrap gap-2 mt-4 noprint' },
            btn(t('retryWrong'), retryWrong, 'primary'),
            btn(t('newSession'), discardSession, 'secondary'),
            btn(t('exportJson'), exportResults, 'secondary'),
            btn(t('print'), () => window.print(), 'secondary')),
          h('div', { class: 'd-flex flex-wrap gap-2 mt-4 noprint', role: 'group', 'aria-label': t('review') },
            filters.map(([key, label]) =>
              btn(t(label), () => { ui.filter = key; render(); }, ui.filter === key ? 'primary' : 'secondary', { 'aria-pressed': ui.filter === key ? 'true' : 'false' }))),
          h('div', { class: 'table-responsive mt-3' },
            h('table', { class: 'table align-middle review' },
              h('thead', {}, h('tr', {},
                h('th', { scope: 'col', text: '#' }),
                h('th', { scope: 'col', text: t('yourAnswer') }),
                h('th', { scope: 'col', text: t('answerKey') }),
                h('th', { scope: 'col' }))),
              h('tbody', {}, body)))))))];
  }

  function render(opts) {
    stopTimer();
    if (ui.view !== 'setup' && session && !useBank(session.bankId)) {
      ui.view = 'setup';
      ui.notice = { kind: 'error', text: t('bankMissing') };
    }
    const body = ui.view === 'quiz' && session ? renderQuiz() : ui.view === 'results' && session ? renderResults() : renderSetup();
    if (ui.view === 'setup') ctx = null;
    const notice = noticeEl();
    root.replaceChildren(...[
      renderHeader(),
      notice,
      h('main', { class: 'container-xxl main', id: 'main' }, body),
      h('footer', { class: 'container-xxl foot' }, h('p', { class: 'text-body-secondary small', text: t('disclaimer') }))
    ].filter(Boolean));

    if (opts && opts.focus) {
      const el = opts.focus === 'q' ? document.getElementById('qtext') : root.querySelector('[data-opt="' + opts.focus.opt + '"]');
      if (el) el.focus();
    }
    if (opts && opts.scroll) {
      const el = document.getElementById(opts.scroll);
      if (el) el.scrollIntoView({ block: 'center' });
    }
    if (ui.view === 'quiz' && session && !session.finishedAt) startTimer();
  }

  /* ---------- theme ---------- */

  function applyTheme(v) {
    const dark = v ? v === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
  }

  function toggleTheme() {
    const next = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    lsSet(THEME_KEY, next);
  }

  /* ---------- global events ---------- */

  document.addEventListener('keydown', (e) => {
    if (ui.view !== 'quiz' || !session || !ctx || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(session.idx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(session.idx - 1); }
    else if (/^[a-hA-H]$/.test(e.key)) {
      const item = session.items[session.idx];
      const i = LETTERS.indexOf(e.key.toUpperCase());
      if (i < item.order.length) { e.preventDefault(); choose(ctx.qMap.get(item.qid), item.order[i], i); }
    }
  });

  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) importFile(f);
  });

  /* ---------- boot ---------- */

  (window.CCDV_BANKS || []).forEach((b) => {
    const v = registerBank(b);
    if (!v.ok) console.warn('Invalid bundled bank', b && b.id, v.errors);
  });
  loadImported();
  ui.bankId = banks.size ? [...banks.keys()][0] : null;
  applyTheme(lsGet(THEME_KEY) || 'dark');
  document.documentElement.lang = I18N.getLang();
  resetForm();
  restore();
  if (session && session.finishedAt && banks.has(session.bankId)) ui.view = 'results';
  render();
})();
