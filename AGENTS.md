# quizMAKER-OCR

## Structure

- `index.html` — single-page entry point for the quiz application.
- `main/data/quiz_data.json` — quiz data (Mapúa Building Utilities Reviewer). 101 questions, each with `id`, `question`, `choices` (array), `answer`.
- `main/src/app.js` — application logic: quiz state management, localStorage save/resume, keyboard shortcuts, wrong-answer explanations.
- `main/src/style.css` — all styles, animations, dark mode theming, responsive breakpoints.
- `.vercel/` — Vercel project link metadata (`.gitignore` excludes it).

## Key Behaviors

- Questions are shuffled on each quiz start. The shuffled order is persisted in localStorage.
- Save-state auto-persists on every interaction (answer, skip, render). Resume restores full quiz state.
- Wrong answers trigger an inline explanation popup with domain-specific definitions and Google search links.
- Skipped questions are collected and presented in a dedicated round after the main quiz.
- "Retry Incorrect" mode creates a mini-quiz from only the wrong answers.

## Deploy

```sh
vercel --yes
```

Vercel project name: `quizmaker-ocr` (lowercase).


## Notes

- No build system, no package.json, no framework. Static content only.
- All questions are text-based (no external images or figures required).
