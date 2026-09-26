// Utility functions for Practice Worksheets: rich-text formatting, answer
// grading, and share links. Persistence lives in storage.js.

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
