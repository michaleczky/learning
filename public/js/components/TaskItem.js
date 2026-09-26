import TaskControl from './TaskControl.js';
import { rich, isCorrect, answerText, itemKey } from '../utils.js';

export default {
  components: { TaskControl },
  template: `
    <li class="item" :class="itemClass" :data-key="key">
      <span class="num">{{ ii + 1 }}.</span>
      <div class="text" v-html="richText"></div>
      <div class="control">
        <TaskControl 
          :task="task" 
          :ti="ti" 
          :ii="ii" 
          :value="answers[key] ?? ''" 
          :readonly="readonly"
          @update="onUpdate"
        />
      </div>
      <div class="feedback">
        <template v-if="checked && task.type !== 'open'">
          <span v-if="isGiven" class="ok">Helyes.</span>
          <template v-else>
            <span class="bad">{{ answered ? 'Nem jó.' : 'Nincs válasz.' }}</span>
            Helyes megoldás: <strong>{{ answerLabel }}</strong>
          </template>
        </template>
        <label v-if="checked && task.type === 'open'" class="selfcheck">
          <input 
            type="checkbox" 
            :checked="selfChecked" 
            :disabled="readonly"
            @change="onSelfCheck"
          />
          Ez sikerült (önértékelés)
        </label>
      </div>
      <div v-if="showSolution" class="solution">
        <strong>{{ task.type === 'open' ? 'Mintamegoldás' : 'Megoldás' }}</strong>
        <span v-html="solutionHtml"></span>
      </div>
    </li>
  `,
  props: ['task', 'ti', 'ii', 'answers', 'checked', 'revealed', 'readonly'],
  computed: {
    key() {
      return itemKey(this.ti, this.ii);
    },
    item() {
      return this.task.items[this.ii] || {};
    },
    richText() {
      return rich(this.item.text || '');
    },
    given() {
      return this.answers[this.key];
    },
    answered() {
      return String(this.given ?? '') !== '';
    },
    isGiven() {
      return isCorrect(this.given, this.item.answer);
    },
    answerLabel() {
      return answerText(this.item.answer);
    },
    itemClass() {
      if (!this.checked || this.task.type === 'open') return null;
      return this.isGiven ? 'correct' : 'incorrect';
    },
    selfChecked() {
      return !!this.answers[`${this.key}:ok`];
    },
    showSolution() {
      return this.revealed || (this.checked && this.task.type === 'open');
    },
    solutionHtml() {
      return rich(this.task.type === 'open' ? (this.item.solution || '') : this.answerLabel);
    }
  },
  methods: {
    onUpdate(ti, ii, value) {
      const key = itemKey(ti, ii);
      this.$emit('save', key, value);
    },
    onSelfCheck(e) {
      this.$emit('save', `${this.key}:ok`, e.target.checked);
    }
  }
};
