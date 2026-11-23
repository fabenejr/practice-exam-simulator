/* Tiny i18n layer: English and Brazilian Portuguese UI strings. Question banks bring their own language. */
(function (root) {
  'use strict';

  const DICT = {
    en: {
      appTitle: 'Practice Exam Simulator',
      language: 'Language',
      theme: 'Light / dark',
      setupTitle: 'New session',
      bank: 'Question set',
      bankHelp: 'A question set is a .json file with questions, answers and explanations. Use the sample or import your own.',
      options: 'Options',
      bankInfo: '{n} questions in {d} domains',
      setupLede: 'Pick a question set, decide how you want to practice, then start. Your progress stays in this browser.',
      ofTotal: 'of {total}',
      importBank: 'Import question set (.json)',
      dropHint: 'or drop a .json file anywhere on this page',
      importOk: 'Question set "{title}" imported.',
      importFail: 'Could not import this file:',
      tooBig: 'File is larger than 2 MB.',
      invalidJson: 'Invalid JSON.',
      bankMissing: 'The question set of the saved session is not loaded. Import it again to resume.',
      noBank: 'No question set is loaded. Import a .json file to start.',
      mode: 'Mode',
      modeStudy: 'Study: feedback after each answer',
      modeExam: 'Exam: answers revealed at the end',
      domains: 'Domains',
      count: 'Number of questions (empty = all)',
      shuffleQ: 'Shuffle question order',
      shuffleO: 'Shuffle options',
      timeLimit: 'Time limit in minutes (0 = none)',
      start: 'Start',
      noQuestions: 'Select at least one domain that has questions.',
      resumeTitle: 'Session in progress',
      resumeInfo: '{bank}: {done} of {total} answered',
      resume: 'Resume',
      discard: 'Discard',
      questionOf: 'Question {n} of {total}',
      chooseOne: 'Choose ONE answer',
      chooseN: 'Choose {n} answers',
      prev: 'Previous',
      next: 'Next',
      mark: 'Mark for review',
      marked: 'Marked for review',
      finish: 'Finish',
      confirmFinish: 'Finish the session and see the results?',
      confirmFinishBlank: '{n} question(s) unanswered. Finish anyway?',
      quit: 'Quit',
      confirmQuit: 'Leave this session? Your progress will be lost.',
      correct: 'Correct!',
      incorrect: 'Incorrect. Correct answer: {ans}',
      correctAnswer: 'Correct answer: {ans}',
      explanation: 'Explanation',
      answered: '{n}/{total} answered',
      timeUp: 'Time is up. The session was finished.',
      navLabel: 'Question navigator',
      shortcuts: 'Shortcuts: ← → navigate, A–H pick an option.',
      results: 'Results',
      scoreLine: '{correct} of {total} correct ({pct}%)',
      aboveTarget: 'Above the {pct}% target',
      belowTarget: 'Below the {pct}% target',
      byDomain: 'By domain',
      review: 'Review',
      filterAll: 'All',
      filterWrong: 'Wrong',
      filterBlank: 'Unanswered',
      filterMarked: 'Marked',
      yourAnswer: 'Your answer',
      blank: '(blank)',
      retryWrong: 'Retry wrong and blank',
      nothingToRetry: 'Nothing to retry. Great job!',
      newSession: 'New session',
      exportJson: 'Export results (JSON)',
      print: 'Print',
      statusOk: 'correct',
      statusBad: 'wrong',
      statusBlank: 'unanswered',
      disclaimer: 'Unofficial study tool, not affiliated with Anthropic. Everything runs in your browser; nothing is sent anywhere.'
    },
    'pt-BR': {
      appTitle: 'Simulador de Prova',
      language: 'Idioma',
      theme: 'Claro / escuro',
      setupTitle: 'Nova sessão',
      bank: 'Conjunto de questões',
      bankHelp: 'Um conjunto de questões é um arquivo .json com perguntas, respostas e explicações. Use o de exemplo ou importe o seu.',
      options: 'Opções',
      bankInfo: '{n} questões em {d} domínios',
      setupLede: 'Escolha um conjunto de questões, decida como quer praticar e comece. Seu progresso fica neste navegador.',
      ofTotal: 'de {total}',
      importBank: 'Importar conjunto (.json)',
      dropHint: 'ou solte um arquivo .json em qualquer lugar da página',
      importOk: 'Conjunto "{title}" importado.',
      importFail: 'Não foi possível importar este arquivo:',
      tooBig: 'O arquivo tem mais de 2 MB.',
      invalidJson: 'JSON inválido.',
      bankMissing: 'O conjunto de questões da sessão salva não está carregado. Importe-o novamente para continuar.',
      noBank: 'Nenhum conjunto de questões carregado. Importe um arquivo .json para começar.',
      mode: 'Modo',
      modeStudy: 'Estudo: gabarito após cada resposta',
      modeExam: 'Prova: gabarito só no final',
      domains: 'Domínios',
      count: 'Número de questões (vazio = todas)',
      shuffleQ: 'Embaralhar a ordem das questões',
      shuffleO: 'Embaralhar as alternativas',
      timeLimit: 'Tempo limite em minutos (0 = sem limite)',
      start: 'Começar',
      noQuestions: 'Selecione pelo menos um domínio que tenha questões.',
      resumeTitle: 'Sessão em andamento',
      resumeInfo: '{bank}: {done} de {total} respondidas',
      resume: 'Continuar',
      discard: 'Descartar',
      questionOf: 'Questão {n} de {total}',
      chooseOne: 'Escolha UMA resposta',
      chooseN: 'Escolha {n} respostas',
      prev: 'Anterior',
      next: 'Próxima',
      mark: 'Marcar para revisar',
      marked: 'Marcada para revisar',
      finish: 'Finalizar',
      confirmFinish: 'Finalizar a sessão e ver o resultado?',
      confirmFinishBlank: '{n} questão(ões) em branco. Finalizar mesmo assim?',
      quit: 'Sair',
      confirmQuit: 'Sair da sessão? Seu progresso será perdido.',
      correct: 'Correta!',
      incorrect: 'Errada. Resposta correta: {ans}',
      correctAnswer: 'Resposta correta: {ans}',
      explanation: 'Explicação',
      answered: '{n}/{total} respondidas',
      timeUp: 'Tempo esgotado. A sessão foi finalizada.',
      navLabel: 'Navegador de questões',
      shortcuts: 'Atalhos: ← → navegam, A–H escolhem a alternativa.',
      results: 'Resultado',
      scoreLine: '{correct} de {total} corretas ({pct}%)',
      aboveTarget: 'Acima da meta de {pct}%',
      belowTarget: 'Abaixo da meta de {pct}%',
      byDomain: 'Por domínio',
      review: 'Revisão',
      filterAll: 'Todas',
      filterWrong: 'Erradas',
      filterBlank: 'Em branco',
      filterMarked: 'Marcadas',
      yourAnswer: 'Sua resposta',
      blank: '(em branco)',
      retryWrong: 'Refazer erradas e em branco',
      nothingToRetry: 'Nada para refazer. Muito bem!',
      newSession: 'Nova sessão',
      exportJson: 'Exportar resultado (JSON)',
      print: 'Imprimir',
      statusOk: 'certa',
      statusBad: 'errada',
      statusBlank: 'em branco',
      disclaimer: 'Ferramenta de estudo não oficial, sem vínculo com a Anthropic. Tudo roda no seu navegador; nada é enviado para fora.'
    }
  };

  const LANGS = [{ code: 'en', label: 'English' }, { code: 'pt-BR', label: 'Português (BR)' }];
  const LANG_KEY = 'ccdv-sim:lang';

  function detect() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && DICT[saved]) return saved;
    } catch (e) { /* storage unavailable */ }
    return String(navigator.language || 'en').toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
  }

  let lang = detect();

  function t(key, vars) {
    let s = (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    return s;
  }

  function setLang(code) {
    if (!DICT[code]) return;
    lang = code;
    try { localStorage.setItem(LANG_KEY, code); } catch (e) { /* ignore */ }
  }

  root.CCDVi18n = { t, setLang, getLang: () => lang, langs: LANGS };
})(window);
