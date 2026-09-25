import WorksheetList from './WorksheetList.js';
import WorksheetViewer from './WorksheetViewer.js';

export default {
  components: { WorksheetList, WorksheetViewer },
  template: `
    <div>
      <WorksheetList v-if="!currentWorksheet" :worksheets="worksheets" />
      <WorksheetViewer v-else :worksheet="currentWorksheet" />
    </div>
  `,
  data() {
    return {
      worksheets: [],
      currentWorksheet: null
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
      const id = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
      if (!id) {
        this.currentWorksheet = null;
        return;
      }
      const ws = this.worksheets.find(w => w.id === id);
      this.currentWorksheet = ws || null;
    }
  }
};
