import { itemKey } from '../utils.js';

export default {
  template: `
    <div>
      <div v-if="task.type === 'choice'" class="choices">
        <label v-for="opt in task.options" :key="opt">
          <input type="radio" :name="key" :value="opt" v-model="selectedValue" :disabled="readonly" />
          {{ opt }}
        </label>
      </div>
      <select v-else-if="task.type === 'select'" class="form-select" v-model="selectedValue" :disabled="readonly">
        <option value="">– válassz –</option>
        <option v-for="opt in task.options" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <input v-else-if="task.type === 'text'" type="text" class="form-control" v-model="selectedValue" autocomplete="off" :disabled="readonly" />
      <textarea v-else-if="task.type === 'open'" class="form-control" v-model="selectedValue" :disabled="readonly"></textarea>
      <p v-else class="error">Ismeretlen feladattípus: {{ task.type }}</p>
    </div>
  `,
  props: ['task', 'ti', 'ii', 'value', 'readonly'],
  emits: ['update'],
  computed: {
    key() {
      return itemKey(this.ti, this.ii);
    },
    selectedValue: {
      get() {
        return this.value ?? '';
      },
      set(newValue) {
        this.$emit('update', this.ti, this.ii, newValue);
      }
    }
  }
};
