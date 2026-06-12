# quizMAKER-OCR

## Structure

- `main/data/quiz_data.json` — quiz data (Mapúa Building Utilities Reviewer). Each question has `id`, `question`, `choices` (array), `answer`.
- `main/src/` — empty; application code goes here.
- `.vercel/` — Vercel project link metadata (`.gitignore` excludes it).

## Deploy

```sh
vercel --yes
```

Vercel project name must be lowercase. Already linked as `quizmaker-ocr`.

## Notes

- No build system, no package.json, no framework. Static content only.
- Git has no commits yet.
