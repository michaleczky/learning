// Vue 3 App for Practice Worksheets

// Utility functions
function rich(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
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

// Storage helpers
const ANSWERS_PREFIX = 'learning:';
const NAME_KEY = 'learning:name';
const SUBMISSIONS_KEY = 'learning:submissions';

function getAnswersKey(id) {
  return `${ANSWERS_PREFIX}${id}`;
}

function loadAnswers(id) {
  try { return JSON.parse(localStorage.getItem(getAnswersKey(id))) || {}; } catch { return {}; }
}

function saveAnswers(id, answers) {
  try { localStorage.setItem(getAnswersKey(id), JSON.stringify(answers)); } catch { /* storage unavailable */ }
}

function getName() {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}

function setName(value) {
  try { localStorage.setItem(NAME_KEY, value); } catch { /* storage unavailable */ }
}

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

// Task item key generator
function itemKey(ti, ii) {
  return `${ti}-${ii}`;
}

// Vue Components
const WorksheetList = {
  template: `
    <div>
      <h1>Feladatlapok</h1>
      <p class="muted">Válassz egy feladatlapot. A válaszaidat a böngésző megjegyzi, amíg nem törlöd őket.</p>
      <div v-for="(group, subject) in groupedWorksheets" :key="subject">
        <h3>{{ subject }}</h3>
        <div class="card-list">
          <a v-for="ws in group" :key="ws.id" :href="'#/' + ws.id" class="card">
            <div class="title">{{ ws.title }}</div>
            <div class="desc">
              <span v-if="ws.grade">{{ ws.grade }}. osztály</span>
              <span v-if="ws.grade && ws.description"> · </span>
              <span>{{ ws.description }}</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  `,
  props: ['worksheets'],
  computed: {
    groupedWorksheets() {
      const groups = new Map();
      this.worksheets.forEach(ws => {
        if (!groups.has(ws.subject)) groups.set(ws.subject, []);
        groups.get(ws.subject).push(ws);
      });
      return Object.fromEntries(groups);
    }
  }
};

const TaskControl = {
  template: `
    <div>
      <div v-if="task.type === 'choice'" class="choices">
        <label v-for="opt in task.options" :key="opt">
          <input type="radio" :name="key" :value="opt" :checked="value === opt" @change="onChange" />
          {{ opt }}
        </label>
      </div>
      <select v-else-if="task.type === 'select'" @change="onChange">
        <option value="" :selected="value === ''">– válassz –</option>
        <option v-for="opt in task.options" :key="opt" :value="opt" :selected="value === opt">{{ opt }}</option>
      </select>
      <input v-else-if="task.type === 'text'" type="text" :value="value" @input="onChange" autocomplete="off" />
      <textarea v-else-if="task.type === 'open'" @input="onChange">{{ value }}</textarea>
      <p v-else class="error">Ismeretlen feladattípus: {{ task.type }}</p>
    </div>
  `,
  props: ['task', 'ti', 'ii', 'value'],
  emits: ['update'],
  computed: {
    key() {
      return itemKey(this.ti, this.ii);
    }
  },
  methods: {
    onChange(e) {
      this.$emit('update', this.ti, this.ii, e.target.value);
    }
  }
};

const TaskItem = {
  template: `
    <li class="item" :data-key="key">
      <span class="num">{{ ii + 1 }}.</span>
      <div class="text" v-html="richText"></div>
      <div class="control">
        <TaskControl 
          :task="task" 
          :ti="ti" 
          :ii="ii" 
          :value="answers[key] ?? ''" 
          @update="onUpdate"
        />
      </div>
      <div class="feedback"></div>
    </li>
  `,
  components: { TaskControl },
  props: ['task', 'ti', 'ii', 'answers'],
  computed: {
    key() {
      return itemKey(this.ti, this.ii);
    },
    richText() {
      return rich(this.task.items[this.ii]?.text || '');
    }
  },
  methods: {
    onUpdate(ti, ii, value) {
      const key = itemKey(ti, ii);
      this.$emit('save', key, value);
    }
  }
};

const LeaderboardPanel = {
  template: `
    <section class="leaderboard-panel hidden" ref="panel">
      <h2>Ranglista</h2>
      <p class="muted">{{ statusMessage }}</p>
      <ol class="leaderboard-list">
        <li v-for="(sub, index) in submissions" :key="index">
          <span class="rank">{{ index + 1 }}.</span>
          <span class="lb-name">{{ sub.name }}</span>
          <span class="lb-score">{{ sub.score }} / {{ sub.max }}</span>
          <span class="lb-when muted">{{ formatDate(sub.createdAt) }}</span>
        </li>
      </ol>
    </section>
  `,
  props: ['worksheet'],
  data() {
    return {
      submissions: [],
      statusMessage: 'Kattints a Ranglista gombra a megtekintéshez.',
      isLoading: false
    };
  },
  methods: {
    async loadLeaderboard() {
      if (!isNpointConfigured(this.worksheet)) {
        this.statusMessage = 'A ranglista nincs beállítva a feladatlaphoz (add npointEndpoint a JSON-hez).';
        this.submissions = [];
        return;
      }
      this.statusMessage = 'Betöltés…';
      this.isLoading = true;
      try {
        const submissions = await loadSubmissionsFromNpoint(this.worksheet);
        if (!submissions || submissions.length === 0) {
          this.statusMessage = 'Még senki nem töltötte ki ezt a feladatlapot.';
          this.submissions = [];
          return;
        }
        this.statusMessage = '';
        this.submissions = submissions;
      } catch (err) {
        this.statusMessage = 'Nem sikerült betölteni a ranglistát (lásd konzol).';
        console.error(err);
      } finally {
        this.isLoading = false;
      }
    },
    formatDate(dateStr) {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleString('hu-HU');
    }
  }
};

const SubmissionsPanel = {
  template: `
    <section class="submissions-panel hidden" ref="panel">
      <h2>Beküldött feladataim</h2>
      <p class="muted">{{ statusMessage }}</p>
      <div class="submissions-list">
        <div v-if="submissions.length === 0" class="muted">
          Még nem küldtél be válaszokat ehez a feladatlaphoz.
        </div>
        <div v-else>
          <div v-for="(sub, index) in submissions" :key="index" class="submission-item">
            <p>
              <strong>{{ index + 1 }}. beküldés</strong>
              <span class="muted"> – {{ sub.name }} – {{ formatDate(sub.date) }}</span>
            </p>
            <div class="url-container">
              <input type="text" :value="sub.url" readonly 
                     @click="copyUrl($event, sub.url)" />
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  props: ['worksheetId'],
  data() {
    return {
      submissions: [],
      statusMessage: 'Kattints a Beküldött feladatok gombra a megtekintéshez.'
    };
  },
  methods: {
    loadSubmissions() {
      const allSubmissions = loadSubmissions();
      this.submissions = allSubmissions[this.worksheetId] || [];
      if (this.submissions.length === 0) {
        this.statusMessage = 'Még nem küldtél be válaszokat ehez a feladatlaphoz.';
      } else {
        this.statusMessage = '';
      }
    },
    formatDate(dateStr) {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleString('hu-HU');
    },
    copyUrl(event, url) {
      event.target.select();
      navigator.clipboard.writeText(url);
    }
  }
};

const WorksheetViewer = {
  template: `
    <div>
      <div class="ws-head">
        <h1>{{ worksheet.title }}</h1>
        <div class="ws-meta">
          <span>{{ worksheet.subject }}</span>
          <span v-if="worksheet.grade"> · {{ worksheet.grade }}. osztály</span>
        </div>
        <p v-if="worksheet.description" class="muted">{{ worksheet.description }}</p>
        <div class="namefield">
          <label for="student-name">Neved a ranglistához:</label>
          <input 
            id="student-name" 
            type="text" 
            v-model="studentName"
            autocomplete="off"
            placeholder="pl. Kovács Anna"
          />
        </div>
      </div>
      
      <div v-for="(task, ti) in worksheet.tasks" :key="ti" class="task">
        <h2>{{ task.title }}</h2>
        <p class="instruction" v-html="rich(task.instruction)"></p>
        <p v-if="task.hint" class="hint" v-html="rich(task.hint)"></p>
        <ol class="items">
          <TaskItem 
            v-for="(item, ii) in task.items" 
            :key="itemKey(ti, ii)" 
            :task="task" 
            :ti="ti" 
            :ii="ii" 
            :answers="answers" 
            @save="onSaveAnswer"
          />
        </ol>
      </div>

      <LeaderboardPanel ref="leaderboard" :worksheet="worksheet" />
      <SubmissionsPanel ref="submissions" :worksheetId="worksheet.id" />

      <div class="toolbar">
        <button class="primary" @click="check">Ellenőrzés</button>
        <button @click="reveal">Megoldások</button>
        <button @click="toggleLeaderboard">Ranglista</button>
        <button @click="toggleSubmissions">Beküldött feladatok</button>
        <button @click="reset">Újrakezdés</button>
        <span class="score">{{ scoreText }}</span>
      </div>

      <div v-if="shareUrl" class="share-url">
        <p>A válaszaid elmentésre kerültek. Ez a linket küld el a tanárdnak:</p>
        <input type="text" :value="shareUrl" readonly 
               @click="copyShareUrl" />
      </div>
    </div>
  `,
  components: { TaskItem, LeaderboardPanel, SubmissionsPanel },
  props: ['worksheet'],
  data() {
    return {
      answers: {},
      checked: false,
      revealed: false,
      studentName: getName(),
      shareUrl: null
    };
  },
  watch: {
    studentName(newVal) {
      setName(newVal);
    },
    worksheet(newVal) {
      if (newVal) {
        this.answers = loadAnswers(newVal.id);
        this.checked = false;
        this.revealed = false;
      }
    }
  },
  computed: {
    scoreText() {
      if (!this.checked) return '';
      const { auto, autoOk, open, openOk } = this.computeScore();
      const parts = [`Helyes: ${autoOk} / ${auto}`];
      if (open) parts.push(`önértékelt: ${openOk} / ${open}`);
      return parts.join(' · ');
    }
  },
  methods: {
    itemKey,
    rich,
    computeScore() {
      let auto = 0, autoOk = 0, open = 0, openOk = 0;
      this.worksheet.tasks.forEach((task, ti) => {
        task.items.forEach((item, ii) => {
          const key = itemKey(ti, ii);
          if (task.type === 'open') {
            open++;
            if (this.answers[`${key}:ok`]) openOk++;
          } else {
            auto++;
            if (isCorrect(this.answers[key], item.answer)) autoOk++;
          }
        });
      });
      return { auto, autoOk, open, openOk };
    },
    onSaveAnswer(key, value) {
      this.answers[key] = value;
      saveAnswers(this.worksheet.id, this.answers);
    },
    check() {
      this.checked = true;
      this.updateScore();
      
      // Save answers to npoint.io
      const name = this.studentName.trim() || 'Anonymous';
      saveAnswersToNpoint(this.worksheet, this.answers, name).then(url => {
        if (url) {
          saveSubmission(this.worksheet.id, url, name);
          if (name !== 'Anonymous') {
            this.shareUrl = url;
          }
        }
      });

      if (isNpointConfigured(this.worksheet) && this.studentName.trim() && 
          confirm('Az eredményed a ranglistára kerül. Folytatod?')) {
        this.submitScore();
      }
    },
    updateScore() {
      // Will be called by computed scoreText
    },
    submitScore() {
      if (!isNpointConfigured(this.worksheet)) return;
      const name = this.studentName.trim();
      if (!name) return;
      const { auto, autoOk } = this.computeScore();
      if (auto === 0) return;
      submitToNpoint({
        worksheetId: this.worksheet.id,
        name: name.slice(0, 60),
        score: autoOk,
        max: auto
      }, this.worksheet).then(() => this.loadLeaderboard()).catch(err => 
        console.error('Ranglista mentése sikertelen:', err));
    },
    loadLeaderboard() {
      this.$refs.leaderboard.loadLeaderboard();
    },
    toggleLeaderboard() {
      const panel = this.$refs.leaderboard.$el;
      panel.classList.toggle('hidden');
      if (!panel.classList.contains('hidden')) {
        this.loadLeaderboard();
        panel.scrollIntoView({ block: 'nearest' });
      }
    },
    toggleSubmissions() {
      const panel = this.$refs.submissions.$el;
      panel.classList.toggle('hidden');
      if (!panel.classList.contains('hidden')) {
        this.$refs.submissions.loadSubmissions();
        panel.scrollIntoView({ block: 'nearest' });
      }
    },
    reveal() {
      this.revealed = true;
    },
    copyShareUrl() {
      if (this.shareUrl) {
        navigator.clipboard.writeText(this.shareUrl);
      }
    },
    reset() {
      if (!confirm('Törlöd az összes válaszodat ezen a feladatlapon?')) return;
      this.answers = {};
      saveAnswers(this.worksheet.id, this.answers);
    }
  }
};

// Main App
const App = {
  template: `
    <div>
      <WorksheetList v-if="!currentWorksheet" :worksheets="worksheets" />
      <WorksheetViewer v-else :worksheet="currentWorksheet" />
    </div>
  `,
  components: { WorksheetList, WorksheetViewer },
  data() {
    return {
      worksheets: [],
      currentWorksheet: null
    };
  },
  created() {
    this.loadWorksheets();
    this.setupRouting();
  },
  methods: {
    async loadWorksheets() {
      try {
        const response = await fetch('data/index.json');
        const index = await response.json();
        const files = Array.isArray(index) ? index : Object.values(index).flat();
        const sheets = await Promise.all(
          files.map(f => fetch(`data/${f}`).then(r => r.json()))
        );
        this.worksheets = sheets;
      } catch (err) {
        console.error('Failed to load worksheets:', err);
      }
    },
    setupRouting() {
      const route = () => {
        const id = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
        if (!id) {
          this.currentWorksheet = null;
          return;
        }
        const ws = this.worksheets.find(w => w.id === id);
        this.currentWorksheet = ws || null;
      };
      window.addEventListener('hashchange', route);
      route();
    }
  }
};

// Mount the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = Vue.createApp(App);
  app.mount('#app');
});
