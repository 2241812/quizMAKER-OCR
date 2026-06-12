# quizMAKER-OCR

An interactive quiz reviewer for **Mapúa University Building Utilities** — covering plumbing, fire protection, HVAC, electrical systems, elevators, escalators, and acoustics.

**Live:** [quizmaker-ocr.vercel.app](https://quizmaker-ocr.vercel.app)

---

## Features

- **101 questions** across 10+ building utility topics
- **Randomized question order** with configurable quiz length (10, 20, 30, 50, or all)
- **Save & Resume** — progress auto-saves to localStorage; resume mid-quiz after closing the tab
- **Wrong-answer explanations** — inline popup with domain-specific definitions, Google search links, and learning insights
- **Skip & revisit** — skip hard questions and tackle them in a dedicated round at the end
- **Retry incorrect** — after results, retry only the questions you got wrong
- **Keyboard shortcuts** — press `1`–`4` or `A`–`D` to select, `Enter` to continue
- **Dark mode** — toggle between light and dark themes (auto-detects system preference)
- **Responsive design** — works on desktop, tablet, and mobile

## Project Structure

```
quizMAKER-OCR/
├── index.html              ← Entry point (single-page app)
├── main/
│   ├── data/
│   │   └── quiz_data.json  ← Question bank (101 questions)
│   └── src/
│       ├── app.js          ← Application logic, save-state, explanations
│       └── style.css       ← Styles, animations, dark mode
├── AGENTS.md               ← AI agent configuration
└── README.md               ← This file
```

## Tech Stack

- **Pure HTML, CSS, JavaScript** — no frameworks, no build tools, no dependencies
- **localStorage** — theme preference and quiz progress persistence
- **Vercel** — static hosting and deployment

## Local Development

Serve the project with any static file server:

```sh
npx serve
```

Then open [http://localhost:3000](http://localhost:3000).

## Deployment

The project is linked to Vercel. Deploy with:

```sh
vercel --yes
```

## Quiz Data Format

Questions are stored in `main/data/quiz_data.json`:

```json
{
  "title": "Mapúa Building Utilities Reviewer",
  "questions": [
    {
      "id": 1,
      "question": "Question text here",
      "choices": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A"
    }
  ]
}
```

Each question has:
- `id` — unique identifier
- `question` — the question text (self-contained, no external images)
- `choices` — array of 3 or 4 answer options
- `answer` — the correct answer (must match one of the choices exactly)

## Topics Covered

| Topic | Questions |
|-------|-----------|
| Plumbing (pipes, fittings, fixtures) | ~40 |
| Fire Protection (standpipes, sprinklers, alarms) | ~20 |
| Electrical Systems (wiring, circuits, grounding) | ~10 |
| HVAC (heating, ventilation, air conditioning) | ~15 |
| Vertical Transportation (elevators, escalators) | ~10 |
| Acoustics & Sound | ~6 |

## License

For educational use at Mapúa University.
