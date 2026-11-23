# Practice Exam Simulator

A small, offline web app (no build step; styled with a bundled copy of Bootstrap 5 CSS) for practicing multiple-choice exams.
Bring your own question set (a JSON file with questions, answers and explanations, also called a question bank) and study with instant feedback or take it as a timed exam.

> Unofficial study tool. It is not affiliated with, endorsed by, or sponsored by Anthropic or any certification body.
> The bundled sample questions are original and are **not** real exam content.

**[Open the live demo](https://fabenejr.github.io/practice-exam-simulator/)** · **[Português (BR)](#português-br)**

## Features

- **Study mode**: the correct answer and an explanation appear right after you answer.
- **Exam mode**: answers are revealed only at the end, with an optional countdown timer.
- **Question banks**: load any bank in the JSON format below (file picker or drag and drop).
- **Domain filter**, question count, shuffled questions and shuffled options.
- Single-answer and multiple-answer questions ("choose two").
- Results by domain against a pass target (default 75%), review of every question, "retry wrong and blank".
- Export results as JSON, print the review.
- English and Brazilian Portuguese interface, light and dark themes, keyboard shortcuts, screen-reader friendly markup.
- Progress is saved in your browser (`localStorage`). Nothing is sent anywhere.

## Quick start

No build step and nothing to install. Bootstrap 5.3 CSS (MIT) is bundled in `vendor/bootstrap`.

1. Download or clone this repository.
2. Open `index.html` in a browser (double-click works).

To serve it locally instead:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

### Publish on GitHub Pages

Push the repository, then enable **Settings → Pages → Deploy from a branch → `main` / root**.

## Question bank format

A bank is one JSON object (see [`schema/question-bank.schema.json`](schema/question-bank.schema.json)):

```json
{
  "schemaVersion": 1,
  "id": "my-bank",
  "title": "My practice bank",
  "language": "en",
  "author": "Me",
  "license": "CC-BY-4.0",
  "passThreshold": 0.75,
  "timeLimitMinutes": 60,
  "domains": [{ "id": "d1", "name": "Networking", "weight": 0.5 }],
  "questions": [
    {
      "id": "1.1",
      "domain": "d1",
      "type": "single",
      "question": "Which protocol resolves names to IP addresses?",
      "options": [
        { "id": "A", "text": "DNS" },
        { "id": "B", "text": "DHCP" }
      ],
      "answer": ["A"],
      "explanation": "DNS maps names to addresses; DHCP hands out addresses."
    }
  ]
}
```

Rules: 2 to 8 options per question; `single` has exactly one answer; `multiple` has two or more (but not all) answers
and the learner must pick exactly that many; every `domain` must exist; ids must be unique.

Validate a bank before sharing it:

```bash
node scripts/validate-bank.mjs path/to/my-bank.json
```

### Importing and bundling

- **Import**: use the *Import bank* button (or drop the file on the page). Imported banks live only in the current page.
- **Bundle with the app**: put a bank in `data/` as a `.js` file that follows [`data/sample-bank.js`](data/sample-bank.js)
  and add a `<script>` tag for it in `index.html`.

## Development

Requires Node 18 or newer (only for tests; the app itself needs no Node).

```bash
npm test          # unit tests for validation, grading and session logic
npm run validate  # validates every bank in data/
```

Layout: `js/core.js` holds the pure logic (no DOM), `js/app.js` the UI, `js/i18n.js` the strings,
`data/` the bundled banks, `css/styles.css` the styles.

Text from banks is rendered with `textContent` only, never as HTML, so imported banks cannot inject markup.

## About question content

Only share questions you wrote or have permission to share. Do not publish real exam questions: certification
exams are usually confidential and protected by an agreement. Keep third-party material out of the repository;
`private/` and `*.private.json` are git-ignored for that reason.

## License

[MIT](LICENSE) for the code and the bundled sample bank.

---

## Português (BR)

Um app web pequeno, offline e sem dependências para praticar provas de múltipla escolha.
Traga seu banco de questões (arquivo JSON) e estude com gabarito imediato ou faça como prova cronometrada.

> Ferramenta de estudo não oficial, sem vínculo com a Anthropic nem com qualquer certificadora.
> As questões de exemplo são originais e **não** são conteúdo de prova real.

**Como usar:** abra o [site online](https://fabenejr.github.io/practice-exam-simulator/) ou baixe o repositório e abra o `index.html` no navegador. Use **Importar banco** (ou arraste um `.json`)
para carregar o seu banco. O formato está descrito acima e no schema em `schema/`.

**Modos:** *Estudo* mostra o gabarito e a explicação logo após responder; *Prova* só revela no final, com cronômetro opcional.

**Conteúdo:** compartilhe apenas questões que você escreveu ou que tenha permissão para publicar. Não publique
questões reais de prova. As pastas `private/` e arquivos `*.private.json` ficam fora do git por esse motivo.

Licença: [MIT](LICENSE).
