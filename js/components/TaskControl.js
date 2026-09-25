import { itemKey } from '../utils.js';

export default {
  template: `
    <div>
      <div v-if="task.type === 'choice'" class="choices">
        <label v-for="opt in task.options" :key="opt">
          <input type="radio" :name="key" :value="opt" v-model="selectedValue" @change="onChange" />
          {{ opt }}
        </label>
      </div>
      <select v-else-if="task.type === 'select'" v-model="selectedValue" @change="onChange">
        <option value="">– válassz –</option>
        <option v-for="opt in task.options" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <input v-else-if="task.type === 'text'" type="text" v-model="selectedValue" @input="onChange" autocomplete="off" />
      <textarea v-else-if="task.type === 'open'" v-model="selectedValue" @input="onChange"></textarea>
      <p v-else class="error">Ismeretlen feladattípus: {{ task.type }}</p>
    </div>
  `,
  props: ['task', 'ti', 'ii', 'value'],
  emits: ['update'],
  data() {
    return {
      selectedValue: this.value
    };
  },
  watch: {
    value(newVal) {
      this.selectedValue = newVal;
    }
  },
  computed: {
    key() {
      return itemKey(this.ti, this.ii);
    }
  },
  methods: {
    onChange(e) {
      this.$emit('update', this.ti, this.ii, this.selectedValue);
    }
  }
};
