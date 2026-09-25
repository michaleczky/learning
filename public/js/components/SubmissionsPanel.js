import { loadSubmissions } from '../utils.js';

export default {
  template: `
    <section class="submissions-panel" :class="{ hidden: !visible }">
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
              <input type="text" class="form-control" :value="sub.url" readonly 
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
      visible: false,
      submissions: [],
      statusMessage: 'Kattints a Beküldött feladatok gombra a megtekintéshez.'
    };
  },
  methods: {
    toggle() {
      this.visible ? this.hide() : this.show();
    },
    hide() {
      this.visible = false;
    },
    show() {
      this.visible = true;
      this.loadSubmissions();
      this.$el.scrollIntoView({ block: 'nearest' });
    },
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
