import TaskControl from './TaskControl.js';
import { rich, itemKey } from '../utils.js';

export default {
  components: { TaskControl },
  template: `
    <li class="item" :data-key="key">
      <span class="num">{{ ii + 1 }}.</span>
      <div class="text" v-html="richText"></div>
      <div class="control">
        <TaskControl 
          :task="task" 
          :ti="ti" 
          :ii="ii" 
          :value="answers[key] ?? ''" 
          @update="onUpdate"
        />
      </div>
      <div class="feedback"></div>
    </li>
  `,
  props: ['task', 'ti', 'ii', 'answers'],
  computed: {
    key() {
      return itemKey(this.ti, this.ii);
    },
    richText() {
      return rich(this.task.items[this.ii]?.text || '');
    }
  },
  methods: {
    onUpdate(ti, ii, value) {
      const key = itemKey(ti, ii);
      this.$emit('save', key, value);
    }
  }
};
