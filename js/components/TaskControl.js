import { itemKey } from '../utils.js';

export default {
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
