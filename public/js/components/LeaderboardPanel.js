import { isNpointConfigured, loadSubmissionsFromNpoint } from '../../npoint-config.js';

export default {
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
