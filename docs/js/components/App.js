import WorksheetList from './WorksheetList.js';
import WorksheetViewer from './WorksheetViewer.js';
import SubmissionViewer from './SubmissionViewer.js';

export default {
  components: { WorksheetList, WorksheetViewer, SubmissionViewer },
  template: `
    <div>
      <WorksheetList v-if="!currentWorksheet" :worksheets="worksheets" />
      <SubmissionViewer v-else-if="submissionAnswersUrl" :worksheet="currentWorksheet" :answersUrl="submissionAnswersUrl" />
      <WorksheetViewer v-else :worksheet="currentWorksheet" />
    </div>
  `,
  data() {
    return {
      worksheets: [],
      currentWorksheet: null,
      submissionAnswersUrl: null
    };
  },
  watch: {
    worksheets: {
      immediate: true,
      handler() {
        this.route();
      }
    }
  },
  created() {
    this.loadWorksheets();
    this.setupRouting();
  },
  unmounted() {
    window.removeEventListener('hashchange', this.route);
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
      window.addEventListener('hashchange', this.route);
      this.route();
    },
    route() {
      const hash = location.hash.replace(/^#\/?/, '');
      if (hash.startsWith('view-submission')) {
        const params = new URLSearchParams(hash.split('?')[1] || '');
        const ws = this.worksheets.find(w => w.id === params.get('ws'));
        this.currentWorksheet = ws || null;
        this.submissionAnswersUrl = ws ? params.get('answers') : null;
        return;
      }
      this.submissionAnswersUrl = null;
      const id = decodeURIComponent(hash);
      if (!id) {
        this.currentWorksheet = null;
        return;
      }
      const ws = this.worksheets.find(w => w.id === id);
      this.currentWorksheet = ws || null;
    }
  }
};
