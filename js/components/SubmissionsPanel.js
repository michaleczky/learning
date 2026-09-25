export default {
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
      const allSubmissions = window.loadSubmissions();
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
