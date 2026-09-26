// Utility functions for Practice Worksheets

// HTML escaping and formatting
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function rich(s) {
  return escapeHtml(s)
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

export function normalize(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!,;]+$/, '');
}

export function isCorrect(given, answer) {
  const answers = Array.isArray(answer) ? answer : [answer];
  const g = normalize(given ?? '');
  return g !== '' && answers.some(a => normalize(a) === g);
}

export function answerText(answer) {
  return Array.isArray(answer) ? answer.join(' / ') : answer;
}

// Storage helpers
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

// Link that opens a submitted worksheet read-only, filled with the student's
// answers and the result. Built for the teacher the student sends it to.
export function submissionLink(worksheetId, answersUrl) {
  const base = location.href.split('#')[0];
  const params = new URLSearchParams({ ws: worksheetId, answers: answersUrl });
  return `${base}#/view-submission?${params.toString()}`;
}

// Task item key generator
export function itemKey(ti, ii) {
  return `${ti}-${ii}`;
}
