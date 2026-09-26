// localStorage-backed state for Practice Worksheets: saved answers per
// worksheet, the student's leaderboard name, and the list of submitted
// answer documents. All persistence lives here; components only call
// these helpers and never touch localStorage directly.

const ANSWERS_PREFIX = 'learning:';
const NAME_KEY = 'learning:name';
const SUBMISSIONS_KEY = 'learning:submissions';

export function getAnswersKey(id) {
  return `${ANSWERS_PREFIX}${id}`;
}

export function loadAnswers(id) {
  try { return JSON.parse(localStorage.getItem(getAnswersKey(id))) || {}; } catch { return {}; }
}

export function saveAnswers(id, answers) {
  try { localStorage.setItem(getAnswersKey(id), JSON.stringify(answers)); } catch { /* storage unavailable */ }
}

export function getName() {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}

export function setName(value) {
  try { localStorage.setItem(NAME_KEY, value); } catch { /* storage unavailable */ }
}

export function loadSubmissions() {
  try { return JSON.parse(localStorage.getItem(SUBMISSIONS_KEY)) || {}; } catch { return {}; }
}

export function saveSubmission(worksheetId, url, name) {
  try {
    const submissions = loadSubmissions();
    if (!submissions[worksheetId]) submissions[worksheetId] = [];
    submissions[worksheetId].push({ url, name, date: new Date().toISOString() });
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  } catch { /* storage unavailable */ }
}
