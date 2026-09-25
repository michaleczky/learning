# Practice Worksheets

A static HTML + JS website for school practice worksheets. Worksheets are JSON files in the `public/data/` directory, which the page loads and makes fillable. No build step required, no dependencies.

## Repository Layout

- `public/` – the published website (deployed to GitHub Pages by `.github/workflows/deploy.yml`)
- `tests/` – Vue component integration tests (not published)

## Running Locally

The browser doesn't allow loading JSON files from `file://` protocol, so you need a local server:

```bash
python3 -m http.server 8000 --directory public
```

Then open: http://localhost:8000

## Testing

Integration tests live in `tests/`. They use Vitest with @vue/test-utils (jsdom) to mount the real components, and MSW (Mock Service Worker) to mock all npoint.io API calls — no real requests are made:

```bash
cd tests && npm install && npm test
```

## Publishing on GitHub Pages

The site is deployed by the "Deploy to Pages" workflow (`.github/workflows/deploy.yml`), which publishes only the `public/` folder on every push to `main`.

1. Push the repository to GitHub.
2. In the repository settings (Settings → Pages), set Source to **GitHub Actions** (once).
3. The site will be available at `https://michaleczky.github.io/learning/`.

The `.nojekyll` file prevents GitHub Pages from running the Jekyll processor.

## Leaderboard & Answer Sharing (npoint.io)

All grading happens entirely in the browser (the `data/*.json` files also contain the correct answers). There is no custom server or backend code. The app uses the free JSON storage service [npoint.io](https://npoint.io) for two purposes:

1. **Leaderboard**: Stores scores for each worksheet (optional)
2. **Answer Sharing**: Each "Check" creates a unique URL with the student's answers that can be shared with a tutor

### Setup Options

**Option A: Per-worksheet endpoints (Recommended)**

Each worksheet can have its own leaderboard endpoint. Add an `npointEndpoint` field to your worksheet JSON:

```json
{
  "id": "unique-identifier",
  "title": "Worksheet Title",
  "subject": "Subject",
  "npointEndpoint": "https://api.npoint.io/your-unique-id-here",
  "tasks": [ ... ]
}
```

To create an endpoint for a worksheet, create a new document in the editor at [npoint.io](https://www.npoint.io), then copy its API URL (e.g. `https://api.npoint.io/xxxx-xxxx`) and add it to your worksheet.

**Option B: Default central endpoint**

If a worksheet doesn't have an `npointEndpoint`, the app falls back to `DEFAULT_NPOINT_ENDPOINT` in `public/npoint-config.js` (empty by default — worksheets without an endpoint simply have no leaderboard).

Set it in `public/npoint-config.js`:
```javascript
const DEFAULT_NPOINT_ENDPOINT = "https://api.npoint.io/your-default-id";
```

### How It Works

- **Answer Sharing**: When a student clicks **Check**, their answers are saved to a new npoint.io document. A unique URL appears that they can copy and send to their tutor. These URLs are also saved in `localStorage` under "Beküldött feladatok" (Submitted worksheets) for later access.

- **Leaderboard**: The name entered at the top of the worksheet is saved by the browser (`localStorage`). If the worksheet has a configured endpoint and the student confirms, their score is sent to npoint.io. The **Leaderboard** button shows the top 20 submissions for the current worksheet, sorted by score.

- npoint.io is a free service. Each worksheet with a configured endpoint has an independent leaderboard with no race conditions between different worksheets.

## Adding a New Worksheet

1. Create a new JSON file in the `public/data/` directory (see the format below).
2. Add the filename to the list in `public/data/index.json`.

## Worksheet Format

```json
{
  "id": "unique-identifier",
  "title": "Worksheet Title",
  "subject": "Subject",
  "grade": 8,
  "description": "Brief description (optional).",
  "npointEndpoint": "https://api.npoint.io/your-unique-id-here",
  "tasks": [ ... ]
}
```

The `id` also appears in the URL (`#/unique-identifier`) and is the key for saved answers, so it should be unique and not change.

**Optional Fields:**
- `npointEndpoint`: Unique npoint.io URL for this worksheet's leaderboard. If not provided, falls back to `DEFAULT_NPOINT_ENDPOINT`.

### Task Types

Every task has `title`, `instruction`, optional `hint`, `type`, and `items` fields. In the `text`, `instruction`, `hint`, and `solution` fields, text wrapped in `*asterisks*` will be rendered in italics.

**`choice`** – select one option from a few choices (radio buttons).

```json
{
  "type": "choice",
  "options": ["option1", "option2"],
  "items": [{ "text": "question text", "answer": "option1" }]
}
```

**`select`** – same as `choice`, but uses a dropdown list. More convenient when there are many options.

**`text`** – free text response that the page automatically checks. The `answer` can be a single string or a list of acceptable answers. Comparison is case-insensitive, ignores leading/trailing spaces, and punctuation at the end.

```json
{
  "type": "text",
  "items": [{ "text": "question: bread ___ butter", "answer": ["and", "or", "with"] }]
}
```

**`open`** – open-ended task that the page cannot automatically grade. When checking, the `solution` sample solution is displayed, and the student marks whether they succeeded.

```json
{
  "type": "open",
  "items": [{ "text": "Create an adjective phrase!", "solution": "For example: *old house*." }]
}
```

## Features

- **Check**: grades automatically gradable tasks, shows sample solutions for open-ended ones, and creates a shareable URL with all answers.
- **Solutions**: shows all solutions.
- **Start Over**: clears answers for the current worksheet.
- **Beküldött feladatok** (Submitted worksheets): view all your previously submitted answer URLs for the current worksheet.
- Answers are saved in the browser's `localStorage`, per worksheet.
- Answer URLs are also stored in `localStorage` so students can return later and resend them.
