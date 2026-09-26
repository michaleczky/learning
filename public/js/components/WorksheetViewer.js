import TaskItem from './TaskItem.js';
import LeaderboardPanel from './LeaderboardPanel.js';
import SubmissionsPanel from './SubmissionsPanel.js';
import { loadAnswers, saveAnswers, getName, setName, loadSubmissions, saveSubmission, submissionLink, rich, isCorrect, answerText, itemKey } from '../utils.js';
import { saveAnswersToNpoint, submitToNpoint, isNpointConfigured } from '../../npoint-config.js';

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
            class="form-control"
            type="text" 
            v-model="studentName"
            autocomplete="off"
            placeholder="pl. Kovács Anna"
          />
        </div>
      </div>

      <ul class="nav nav-tabs" role="tablist">
        <li class="nav-item">
          <button type="button" class="nav-link" :class="{ active: activeTab === 'worksheet' }" @click="showTab('worksheet')">Feladatlap</button>
        </li>
        <li class="nav-item">
          <button type="button" class="nav-link" :class="{ active: activeTab === 'leaderboard' }" @click="showTab('leaderboard')">Ranglista</button>
        </li>
        <li class="nav-item">
          <button type="button" class="nav-link" :class="{ active: activeTab === 'submissions' }" @click="showTab('submissions')">Beküldött feladatok</button>
        </li>
      </ul>

      <div v-show="activeTab === 'worksheet'">
        <div v-for="(task, ti) in worksheet.tasks" :key="taskKey(task, ti)" class="task">
          <h2>{{ task.title }}</h2>
          <p class="instruction" v-html="rich(task.instruction)"></p>
          <p v-if="task.hint" class="hint" v-html="rich(task.hint)"></p>
          <ol class="items">
            <TaskItem 
              v-for="(item, ii) in task.items" 
              :key="getItemKey(ti, ii)" 
              :task="task" 
              :ti="ti" 
              :ii="ii" 
              :answers="answers" 
              :checked="checked" 
              :revealed="revealed" 
              @save="onSaveAnswer"
            />
          </ol>
        </div>
      </div>

      <div v-show="activeTab === 'leaderboard'">
        <LeaderboardPanel ref="leaderboard" :worksheet="worksheet" />
      </div>
      <div v-show="activeTab === 'submissions'">
        <SubmissionsPanel ref="submissions" :worksheetId="worksheet.id" />
      </div>

      <div class="toolbar">
        <button type="button" class="btn btn-primary" @click="check">Ellenőrzés</button>
        <button type="button" class="btn btn-outline-secondary" @click="reveal">Megoldások</button>
        <button type="button" class="btn btn-outline-secondary" @click="reset">Újrakezdés</button>
        <span class="score">{{ scoreText }}</span>
      </div>

      <div v-if="shareUrl" class="share-url">
        <p>A válaszaid elmentésre kerültek. Ezt a linket küld el a tanárnak:</p>
        <input type="text" class="form-control" :value="shareLink" readonly 
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
      activeTab: 'worksheet',
      studentName: getName(),
      shareUrl: null
    };
  },
  watch: {
    studentName(newVal) {
      setName(newVal);
    },
    worksheet: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.answers = loadAnswers(newVal.id);
          this.checked = false;
          this.revealed = false;
        }
      }
    }
  },
  computed: {
    shareLink() {
      return this.shareUrl ? submissionLink(this.worksheet.id, this.shareUrl) : null;
    },
    scoreText() {
      if (!this.checked) return '';
      const { auto, autoOk, open, openOk } = this.computeScore();
      const parts = [`Helyes: ${autoOk} / ${auto}`];
      if (open) parts.push(`önértékelt: ${openOk} / ${open}`);
      return parts.join(' · ');
    }
  },
  methods: {
    getItemKey(ti, ii) {
      return itemKey(ti, ii);
    },
    taskKey(task, ti) {
      return `${task.title || 'task'}-${ti}`;
    },
    rich,
    computeScore() {
      let auto = 0, autoOk = 0, open = 0, openOk = 0;
      this.worksheet.tasks.forEach((task, ti) => {
        task.items.forEach((item, ii) => {
          const key = this.getItemKey(ti, ii);
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
    showTab(tab) {
      this.activeTab = tab;
      if (tab === 'leaderboard') this.$refs.leaderboard.show();
      else if (tab === 'submissions') this.$refs.submissions.show();
    },
    reveal() {
      this.revealed = true;
    },
    copyShareUrl() {
      if (this.shareLink) {
        navigator.clipboard.writeText(this.shareLink);
      }
    },
    reset() {
      if (!confirm('Törlöd az összes válaszodat ezen a feladatlapon?')) return;
      this.answers = {};
      this.checked = false;
      this.revealed = false;
      saveAnswers(this.worksheet.id, this.answers);
    }
  }
};
