import { getName, setName } from '../utils.js';

export default {
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
