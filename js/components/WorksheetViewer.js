import TaskItem from './TaskItem.js';
import LeaderboardPanel from './LeaderboardPanel.js';
import SubmissionsPanel from './SubmissionsPanel.js';
import { loadAnswers, saveAnswers, getName, setName, loadSubmissions, saveSubmission, rich, isCorrect, answerText, itemKey } from '../utils.js';

export default {
  components: { TaskItem, LeaderboardPanel, SubmissionsPanel },
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
      
      // Save answers to npoint.io
      const name = this.studentName.trim() || 'Anonymous';
      window.saveAnswersToNpoint(this.worksheet, this.answers, name).then(url => {
        if (url) {
          saveSubmission(this.worksheet.id, url, name);
          if (name !== 'Anonymous') {
            this.shareUrl = url;
          }
        }
      });

      if (window.isNpointConfigured(this.worksheet) && this.studentName.trim() && 
          confirm('Az eredményed a ranglistára kerül. Folytatod?')) {
        this.submitScore();
      }
    },
    submitScore() {
      if (!window.isNpointConfigured(this.worksheet)) return;
      const name = this.studentName.trim();
      if (!name) return;
      const { auto, autoOk } = this.computeScore();
      if (auto === 0) return;
      window.submitToNpoint({
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
