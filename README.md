# Practice Worksheets

A static HTML + JS website for school practice worksheets. Worksheets are JSON files in the `data/` directory, which the page loads and makes fillable. No build step required, no dependencies.

## Running Locally

The browser doesn't allow loading JSON files from `file://` protocol, so you need a local server:

```bash
python3 -m http.server 8000
```

Then open: http://localhost:8000

## Publishing on GitHub Pages

1. Push the repository to GitHub.
2. In the repository settings (Settings → Pages), select the `main` branch and the `/ (root)` folder.
3. The site will be available at `https://michaleczky.github.io/learning/`.

The `.nojekyll` file prevents GitHub Pages from running the Jekyll processor.

## Leaderboard (npoint.io)

All grading happens entirely in the browser (the `data/*.json` files also contain the correct answers). There is no custom server or backend code. The names, dates, and scores of participants are stored using the free JSON storage service [npoint.io](https://npoint.io), which the client reads and writes directly.

### Initial Setup

1. Visit the [npoint.io API](https://api.npoint.io/) page, or send a POST request:
   ```bash
   curl -X POST https://api.npoint.io/ -H "Content-Type: application/json" -d '[]'
   ```
   The response will contain a unique URL (e.g., `https://api.npoint.io/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
2. Copy the received URL as the value of the `NPPOINT_ENDPOINT` variable in the `npoint-config.js` file.
3. For local testing, start a server (see above), fill out a worksheet, and verify that the Leaderboard button works.

### How It Works

- The name entered in the name field at the top of the worksheet is saved by the browser (`localStorage`), and after every **Check** operation, the scores for automatically gradable tasks are sent to npoint.io (open, self-assessed tasks are not included).
- The **Leaderboard** button shows the top 20 submissions for the current worksheet, sorted by score in descending order.
- If `npoint-config.js` is not filled in, filling out and grading worksheets works the same way, but the leaderboard will indicate that it is not configured.
- npoint.io is a free service, but you need to share the URL with others if you want to use the leaderboard collaboratively.

## Adding a New Worksheet

1. Create a new JSON file in the `data/` directory (see the format below).
2. Add the filename to the list in `data/index.json`.

## Worksheet Format

```json
{
  "id": "unique-identifier",
  "title": "Worksheet Title",
  "subject": "Subject",
  "grade": 8,
  "description": "Brief description (optional).",
  "tasks": [ ... ]
}
```

The `id` also appears in the URL (`#/unique-identifier`) and is the key for saved answers, so it should be unique and not change.

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

- **Check**: grades automatically gradable tasks, shows sample solutions for open-ended ones.
- **Solutions**: shows all solutions.
- **Start Over**: clears answers for the current worksheet.
- Answers are saved in the browser's `localStorage`, per worksheet.
