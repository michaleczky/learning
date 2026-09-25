const app = document.getElementById('app');
const crumb = document.getElementById('crumb');
const state = { worksheets: [], answers: {}, checked: false, revealed: false };

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(c));
  }
  return el;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function rich(s) {
  return escapeHtml(s).replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
}

function normalize(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!,;]+$/, '');
}

function isCorrect(given, answer) {
  const answers = Array.isArray(answer) ? answer : [answer];
  const g = normalize(given ?? '');
  return g !== '' && answers.some(a => normalize(a) === g);
}

function answerText(answer) {
  return Array.isArray(answer) ? answer.join(' / ') : answer;
}

const storageKey = id => `learning:${id}`;
function loadSaved(id) {
  try { return JSON.parse(localStorage.getItem(storageKey(id))) || {}; } catch { return {}; }
}
function save(id) {
  try { localStorage.setItem(storageKey(id), JSON.stringify(state.answers)); } catch { /* storage unavailable */ }
}

const NAME_KEY = 'learning:name';
function getName() {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}
function setName(value) {
  try { localStorage.setItem(NAME_KEY, value); } catch { /* storage unavailable */ }
}

// Store submission URLs per worksheet for resending
const SUBMISSIONS_KEY = 'learning:submissions';
function loadSubmissions() {
  try { return JSON.parse(localStorage.getItem(SUBMISSIONS_KEY)) || {}; } catch { return {}; }
}
function saveSubmission(worksheetId, url, name) {
  try {
    const submissions = loadSubmissions();
    if (!submissions[worksheetId]) submissions[worksheetId] = [];
    submissions[worksheetId].push({ url, name, date: new Date().toISOString() });
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  } catch { /* storage unavailable */ }
}

async function loadWorksheets() {
  const index = await fetch('data/index.json').then(r => r.json());
  // Handle both array format and taxonomy (object) format
  const files = Array.isArray(index) ? index : Object.values(index).flat();
  const sheets = await Promise.all(files.map(f => fetch(`data/${f}`).then(r => r.json())));
  state.worksheets = sheets;
}

function renderList() {
  crumb.textContent = '';
  const groups = new Map();
  for (const ws of state.worksheets) {
    if (!groups.has(ws.subject)) groups.set(ws.subject, []);
    groups.get(ws.subject).push(ws);
  }
  app.replaceChildren(
    h('h1', {}, 'Feladatlapok'),
    h('p', { class: 'muted' }, 'Válassz egy feladatlapot. A válaszaidat a böngésző megjegyzi, amíg nem törlöd őket.'),
    ...[...groups.entries()].map(([subject, list]) =>
      h('section', { class: 'subject-group' },
        h('h3', {}, subject),
        h('div', { class: 'card-list' },
          ...list.map(ws =>
            h('a', { class: 'card', href: `#/${ws.id}` },
              h('div', { class: 'title' }, ws.title),
              h('div', { class: 'desc' }, [ws.grade ? `${ws.grade}. osztály` : null, ws.description].filter(Boolean).join(' · '))
            )
          )
        )
      )
    )
  );
}

function itemKey(ti, ii) { return `${ti}-${ii}`; }

function renderControl(task, ti, ii) {
  const key = itemKey(ti, ii);
  const value = state.answers[key] ?? '';
  const onChange = e => {
    state.answers[key] = e.target.value;
    save(state.current.id);
    const li = e.target.closest('.item');
    li.classList.remove('correct', 'incorrect');
    li.querySelector('.feedback')?.replaceChildren();
  };

  switch (task.type) {
    case 'choice':
      return h('div', { class: 'choices' },
        ...task.options.map(opt =>
          h('label', {},
            h('input', { type: 'radio', name: key, value: opt, checked: value === opt, onchange: onChange }),
            opt
          )
        )
      );
    case 'select':
      return h('select', { onchange: onChange },
        h('option', { value: '', selected: value === '' }, '– válassz –'),
        ...task.options.map(opt => h('option', { value: opt, selected: value === opt }, opt))
      );
    case 'text':
      return h('input', { type: 'text', value, oninput: onChange, autocomplete: 'off' });
    case 'open':
      return h('textarea', { oninput: onChange }, value);
    default:
      return h('p', { class: 'error' }, `Ismeretlen feladattípus: ${task.type}`);
  }
}

function renderItem(task, ti, item, ii) {
  const li = h('li', { class: 'item', 'data-key': itemKey(ti, ii) },
    h('span', { class: 'num' }, `${ii + 1}.`),
    h('div', { class: 'text', html: rich(item.text) }),
    h('div', { class: 'control' }, renderControl(task, ti, ii)),
    h('div', { class: 'feedback' })
  );
  return li;
}

function renderWorksheet(ws) {
  state.current = ws;
  state.answers = loadSaved(ws.id);
  state.checked = false;
  state.revealed = false;
  crumb.textContent = `${ws.subject} › ${ws.title}`;

  app.replaceChildren(
    h('div', { class: 'ws-head' },
      h('h1', {}, ws.title),
      h('div', { class: 'ws-meta' }, [ws.subject, ws.grade ? `${ws.grade}. osztály` : null].filter(Boolean).join(' · ')),
      ws.description ? h('p', { class: 'muted' }, ws.description) : null,
      h('div', { class: 'namefield' },
        h('label', { for: 'student-name' }, 'Neved a ranglistához:'),
        h('input', {
          id: 'student-name', type: 'text', value: getName(), autocomplete: 'off',
          placeholder: 'pl. Kovács Anna',
          oninput: e => setName(e.target.value)
        })
      )
    ),
    ...ws.tasks.map((task, ti) =>
      h('section', { class: 'task' },
        h('h2', {}, task.title),
        h('p', { class: 'instruction', html: rich(task.instruction) }),
        task.hint ? h('p', { class: 'hint', html: rich(task.hint) }) : null,
        h('ol', { class: 'items' }, ...task.items.map((item, ii) => renderItem(task, ti, item, ii)))
      )
    ),
    renderLeaderboardPanel(),
    renderSubmissionsPanel(),
    h('div', { class: 'toolbar' },
      h('button', { class: 'primary', onclick: check }, 'Ellenőrzés'),
      h('button', { onclick: reveal }, 'Megoldások'),
      h('button', { onclick: toggleLeaderboard }, 'Ranglista'),
      h('button', { onclick: toggleSubmissions }, 'Beküldött feladatok'),
      h('button', { onclick: reset }, 'Újrakezdés'),
      h('span', { class: 'score', id: 'score' })
    )
  );
}

function check() {
  state.checked = true;

  state.current.tasks.forEach((task, ti) => {
    task.items.forEach((item, ii) => {
      const key = itemKey(ti, ii);
      const li = app.querySelector(`.item[data-key="${key}"]`);
      const fb = li.querySelector('.feedback');
      li.classList.remove('correct', 'incorrect');
      fb.replaceChildren();

      if (task.type === 'open') {
        showSolution(li, item.solution, 'Mintamegoldás');
        const okKey = `${key}:ok`;
        fb.append(
          h('label', { class: 'selfcheck' },
            h('input', {
              type: 'checkbox', checked: !!state.answers[okKey],
              onchange: e => { state.answers[okKey] = e.target.checked; save(state.current.id); updateScore(); }
            }),
            'Ez sikerült (önértékelés)'
          )
        );
        return;
      }

      const given = state.answers[key];
      if (isCorrect(given, item.answer)) {
        li.classList.add('correct');
        fb.append(h('span', { class: 'ok' }, 'Helyes.'));
      } else {
        li.classList.add('incorrect');
        fb.append(h('span', { class: 'bad' }, given ? 'Nem jó.' : 'Nincs válasz.'), ' Helyes megoldás: ', h('strong', {}, answerText(item.answer)));
      }
    });
  });

  updateScore();
  
  // Save answers to a separate npoint.io document and show URL to student
  const studentName = getName().trim();
  if (studentName) {
    saveAnswersToNpoint(state.current, state.answers, studentName).then(url => {
      if (url) {
        // Save URL to localStorage for resending later
        saveSubmission(state.current.id, url, studentName);
        
        const shareMsg = h('div', { class: 'share-url', id: 'share-url' },
          h('p', {}, 'A válaszaid elmentésre kerültek. Ez a linket küld el a tanárodnak:'),
          h('input', { 
            type: 'text', 
            value: url, 
            readonly: true,
            onclick: e => { e.target.select(); navigator.clipboard.writeText(url); }
          })
        );
        // Insert share message after the toolbar
        const toolbar = document.querySelector('.toolbar');
        if (toolbar && !document.getElementById('share-url')) {
          toolbar.after(shareMsg);
        }
      }
    });
  }
  
  if (isNpointConfigured() && studentName && confirm('Az eredményed a ranglistára kerül. Folytatod?')) {
    submitScore();
  }
  document.getElementById('score').scrollIntoView({ block: 'nearest' });
}

function computeScore() {
  let auto = 0, autoOk = 0, open = 0, openOk = 0;
  state.current.tasks.forEach((task, ti) => {
    task.items.forEach((item, ii) => {
      const key = itemKey(ti, ii);
      if (task.type === 'open') { open++; if (state.answers[`${key}:ok`]) openOk++; }
      else { auto++; if (isCorrect(state.answers[key], item.answer)) autoOk++; }
    });
  });
  return { auto, autoOk, open, openOk };
}

function updateScore() {
  if (!state.checked) return;
  const { auto, autoOk, open, openOk } = computeScore();
  const parts = [`Helyes: ${autoOk} / ${auto}`];
  if (open) parts.push(`önértékelt: ${openOk} / ${open}`);
  document.getElementById('score').textContent = parts.join(' · ');
}

function submitScore() {
  if (!isNpointConfigured()) return;
  const name = getName().trim();
  if (!name) return;
  const { auto, autoOk } = computeScore();
  if (auto === 0) return;
  submitToNpoint({
    worksheetId: state.current.id,
    name: name.slice(0, 60),
    score: autoOk,
    max: auto
  }).then(() => loadLeaderboard()).catch(err => console.error('Ranglista mentése sikertelen:', err));
}

function renderLeaderboardPanel() {
  return h('section', { class: 'leaderboard-panel hidden', id: 'leaderboard-panel' },
    h('h2', {}, 'Ranglista'),
    h('p', { class: 'muted', id: 'leaderboard-status' }, 'Kattints a Ranglista gombra a megtekintéshez.'),
    h('ol', { class: 'leaderboard-list', id: 'leaderboard-list' })
  );
}

function toggleLeaderboard() {
  const panel = document.getElementById('leaderboard-panel');
  const opening = panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  if (opening) {
    loadLeaderboard();
    panel.scrollIntoView({ block: 'nearest' });
  }
}

async function loadLeaderboard() {
  const status = document.getElementById('leaderboard-status');
  const list = document.getElementById('leaderboard-list');
  if (!status || !list) return;
  if (!isNpointConfigured()) {
    status.textContent = 'A ranglista nincs beállítva (töltsd ki a npoint-config.js fájlt).';
    list.replaceChildren();
    return;
  }
  status.textContent = 'Betöltés…';
  list.replaceChildren();
  
  try {
    const submissions = await loadSubmissionsFromNpoint(state.current.id);
    
    if (!submissions || submissions.length === 0) {
      status.textContent = 'Még senki nem töltötte ki ezt a feladatlapot.';
      return;
    }
    
    status.textContent = '';
    list.replaceChildren(
      ...submissions.map((d, i) => {
        const when = d.createdAt ? new Date(d.createdAt).toLocaleString('hu-HU') : '';
        return h('li', {},
          h('span', { class: 'rank' }, `${i + 1}.`),
          h('span', { class: 'lb-name' }, d.name),
          h('span', { class: 'lb-score' }, `${d.score} / ${d.max}`),
          h('span', { class: 'lb-when muted' }, when)
        );
      })
    );
  } catch (err) {
    status.textContent = 'Nem sikerült betölteni a ranglistát (lásd konzol).';
    console.error(err);
  }
}

// Render submissions panel
function renderSubmissionsPanel() {
  return h('section', { class: 'submissions-panel hidden', id: 'submissions-panel' },
    h('h2', {}, 'Beküldött feladataim'),
    h('p', { class: 'muted', id: 'submissions-status' }, 'Kattints a Beküldött feladatok gombra a megtekintéshez.'),
    h('div', { class: 'submissions-list', id: 'submissions-list' })
  );
}

// Load and display saved submissions from localStorage
function loadAndDisplaySubmissions() {
  const listEl = document.getElementById('submissions-list');
  const statusEl = document.getElementById('submissions-status');
  if (!listEl || !statusEl) return;

  const allSubmissions = loadSubmissions();
  const currentId = state.current?.id;
  
  // Get submissions for current worksheet
  const submissions = currentId ? allSubmissions[currentId] || [] : [];
  
  if (!submissions || submissions.length === 0) {
    statusEl.textContent = currentId ? 'Még nem küldtél be válaszokat ehez a feladatlaphoz.' : 'Nincs beküldött feladat.';
    listEl.replaceChildren();
    return;
  }

  statusEl.textContent = '';
  listEl.replaceChildren(
    ...submissions.map((sub, i) => {
      const date = sub.date ? new Date(sub.date).toLocaleString('hu-HU') : '';
      return h('div', { class: 'submission-item' },
        h('p', {},
          h('strong', {}, `${i + 1}. beküldés`),
          h('span', { class: 'muted' }, ` – ${sub.name} – ${date}`)
        ),
        h('div', { class: 'url-container' },
          h('input', {
            type: 'text',
            value: sub.url,
            readonly: true,
            onclick: e => { e.target.select(); navigator.clipboard.writeText(sub.url); }
          })
        )
      );
    })
  );
}

function toggleSubmissions() {
  const panel = document.getElementById('submissions-panel');
  const opening = panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  if (opening) {
    loadAndDisplaySubmissions();
    panel.scrollIntoView({ block: 'nearest' });
  }
}

function showSolution(li, text, label) {
  li.querySelector('.solution')?.remove();
  li.append(h('div', { class: 'solution' }, h('strong', {}, label), h('span', { html: rich(text) })));
}

function reveal() {
  state.revealed = true;
  state.current.tasks.forEach((task, ti) => {
    task.items.forEach((item, ii) => {
      const li = app.querySelector(`.item[data-key="${itemKey(ti, ii)}"]`);
      showSolution(li, task.type === 'open' ? item.solution : answerText(item.answer), task.type === 'open' ? 'Mintamegoldás' : 'Megoldás');
    });
  });
}

function reset() {
  if (!confirm('Törlöd az összes válaszodat ezen a feladatlapon?')) return;
  state.answers = {};
  save(state.current.id);
  renderWorksheet(state.current);
}

function route() {
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (!id) return renderList();
  const ws = state.worksheets.find(w => w.id === id);
  if (!ws) {
    app.replaceChildren(h('p', { class: 'error' }, 'Nincs ilyen feladatlap. ', h('a', { href: '#/' }, 'Vissza a listához')));
    return;
  }
  renderWorksheet(ws);
}

window.addEventListener('hashchange', route);

loadWorksheets()
  .then(route)
  .catch(err => {
    app.replaceChildren(
      h('div', { class: 'error' },
        h('p', {}, 'Nem sikerült betölteni a feladatlapokat.'),
        h('p', { class: 'muted' }, 'Ha fájlból nyitottad meg az oldalt, indíts egy helyi szervert (pl. ', h('code', {}, 'python3 -m http.server'), ').'),
        h('p', { class: 'muted' }, String(err))
      )
    );
  });
