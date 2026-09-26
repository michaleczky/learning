import TaskItem from './TaskItem.js';
import { rich, isCorrect, itemKey } from '../utils.js';

// Read-only view of a submitted worksheet, opened through a
// #/view-submission?ws=...&answers=... link sent by the student.
// Loads the answers from the npoint.io document and renders the filled
// worksheet with the feedback and the result for the teacher.
export default {
  components: { TaskItem },
  template: `
    <div class="submission-viewer">
      <div class="ws-head">
        <h1>{{ worksheet.title }}</h1>
        <div class="ws-meta">
          <span>{{ worksheet.subject }}</span>
          <span v-if="worksheet.grade"> · {{ worksheet.grade }}. osztály</span>
        </div>
        <p class="submission-meta">
          Beküldte: <strong>{{ studentName || 'Névtelen' }}</strong>
          <span v-if="savedAt" class="muted"> – {{ formatDate(savedAt) }}</span>
        </p>
        <p v-if="scoreText" class="score">{{ scoreText }}</p>
      </div>

      <p v-if="loading" class="muted">Beküldött válaszok betöltése…</p>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else>
        <div v-for="(task, ti) in worksheet.tasks" :key="taskKey(task, ti)" class="task">
          <h2>{{ task.title }}</h2>
          <p class="instruction" v-html="rich(task.instruction)"></p>
          <ol class="items">
            <TaskItem 
              v-for="(item, ii) in task.items" 
              :key="getItemKey(ti, ii)" 
              :task="task" 
              :ti="ti" 
              :ii="ii" 
              :answers="answers" 
              :checked="true" 
              :readonly="true" 
            />
          </ol>
        </div>
      </div>
    </div>
  `,
  props: ['worksheet', 'answersUrl'],
  data() {
    return {
      answers: {},
      studentName: '',
      savedAt: null,
      loading: false,
      error: null
    };
  },
  computed: {
    scoreText() {
      if (this.loading || this.error) return '';
      const { auto, autoOk, open, openOk } = this.computeScore();
      const parts = [`Helyes: ${autoOk} / ${auto}`];
      if (open) parts.push(`önértékelt: ${openOk} / ${open}`);
      return parts.join(' · ');
    }
  },
  watch: {
    answersUrl: {
      immediate: true,
      handler(newVal) {
        if (newVal) this.loadAnswers();
      }
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
    async loadAnswers() {
      this.loading = true;
      this.error = null;
      this.answers = {};
      this.studentName = '';
      this.savedAt = null;
      try {
        const response = await fetch(this.answersUrl);
        if (!response.ok) {
          throw new Error(`Failed to load: ${response.status}`);
        }
        const data = await response.json();
        this.studentName = data.studentName || '';
        this.savedAt = data.savedAt || null;
        this.answers = data.answers || {};
      } catch (err) {
        console.error('Error loading submitted answers:', err);
        this.error = 'A beküldött válaszokat nem sikerült betölteni.';
      } finally {
        this.loading = false;
      }
    },
    formatDate(dateStr) {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleString('hu-HU');
    }
  }
};
