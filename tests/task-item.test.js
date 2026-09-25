// Unit tests for the TaskItem component: item rendering with rich text,
// checked feedback (correct / incorrect / unanswered), open-question
// self-assessment, and solution reveal.

import { mount } from '@vue/test-utils';
import TaskItem from '../public/js/components/TaskItem.js';

const choiceTask = {
  title: 'Choice',
  type: 'choice',
  options: ['Yes', 'No'],
  items: [{ text: 'Is the sky *blue*?', answer: 'Yes' }]
};

const openTask = {
  title: 'Open',
  type: 'open',
  items: [{ text: 'Describe your favorite animal.', solution: '*I like dogs.*' }]
};

function mountItem(task, ii, answers, { checked = false, revealed = false, ti = 0 } = {}) {
  return mount(TaskItem, { props: { task, ti, ii, answers, checked, revealed } });
}

describe('TaskItem rendering', () => {
  it('renders the item number and applies rich formatting to the text', () => {
    const wrapper = mountItem(choiceTask, 0, {});
    expect(wrapper.find('.num').text()).toBe('1.');
    expect(wrapper.find('.text em').text()).toBe('blue');
  });

  it('adds no correctness class and no feedback before checking', () => {
    const wrapper = mountItem(choiceTask, 0, { '0-0': 'Yes' });
    const classes = wrapper.find('li.item').classes();
    expect(classes).not.toContain('correct');
    expect(classes).not.toContain('incorrect');
    expect(wrapper.find('.feedback > *').exists()).toBe(false);
    expect(wrapper.find('.solution').exists()).toBe(false);
  });
});

describe('TaskItem checked feedback', () => {
  it('marks a correct answer with the correct class and a positive message', () => {
    const wrapper = mountItem(choiceTask, 0, { '0-0': 'yes' }, { checked: true });
    expect(wrapper.find('li.item').classes()).toContain('correct');
    expect(wrapper.find('.feedback .ok').text()).toBe('Helyes.');
    expect(wrapper.find('.feedback .bad').exists()).toBe(false);
  });

  it('marks a wrong answer and shows the expected solution', () => {
    const wrapper = mountItem(choiceTask, 0, { '0-0': 'No' }, { checked: true });
    expect(wrapper.find('li.item').classes()).toContain('incorrect');
    expect(wrapper.text()).toContain('Nem jó.');
    expect(wrapper.text()).toContain('Helyes megoldás:');
    expect(wrapper.text()).toContain('Yes');
  });

  it('reports a missing answer without the incorrect answer being shown', () => {
    const wrapper = mountItem(choiceTask, 0, {}, { checked: true });
    expect(wrapper.find('li.item').classes()).toContain('incorrect');
    expect(wrapper.text()).toContain('Nincs válasz.');
  });

  it('joins multiple accepted answers with a slash in the label', () => {
    const task = { ...choiceTask, items: [{ text: 'Two plus two?', answer: ['4', 'four'] }] };
    const wrapper = mountItem(task, 0, {}, { checked: true });
    expect(wrapper.text()).toContain('4 / four');
  });
});

describe('TaskItem open questions', () => {
  it('offers a self-assessment checkbox after check and saves it with the :ok key', async () => {
    const wrapper = mountItem(openTask, 0, {}, { checked: true });
    const checkbox = wrapper.find('.selfcheck input');
    expect(checkbox.exists()).toBe(true);

    await checkbox.setValue(true);

    expect(wrapper.emitted('save')).toEqual([['0-0:ok', true]]);
  });

  it('shows the sample solution after check', () => {
    const wrapper = mountItem(openTask, 0, {}, { checked: true });
    const solution = wrapper.find('.solution');
    expect(solution.exists()).toBe(true);
    expect(solution.text()).toContain('Mintamegoldás');
    expect(solution.find('em').text()).toBe('I like dogs.');
  });

  it('pre-checks the self-assessment box from the saved answer', () => {
    const wrapper = mountItem(openTask, 0, { '0-0:ok': true }, { checked: true });
    expect(wrapper.find('.selfcheck input').element.checked).toBe(true);
  });
});

describe('TaskItem reveal', () => {
  it('shows the solution without checking first', () => {
    const wrapper = mountItem(choiceTask, 0, {}, { revealed: true });
    const solution = wrapper.find('.solution');
    expect(solution.exists()).toBe(true);
    expect(solution.text()).toContain('Megoldás');
    expect(solution.text()).toContain('Yes');
  });

  it('escapes HTML in the item text', () => {
    const task = { ...choiceTask, items: [{ text: '<script>alert(1)</script>', answer: 'Yes' }] };
    const wrapper = mountItem(task, 0, {});
    expect(wrapper.find('.text script').exists()).toBe(false);
    expect(wrapper.find('.text').html()).toContain('&lt;script&gt;');
  });
});

describe('TaskItem answer forwarding', () => {
  it('forwards TaskControl updates as save events with the item key', async () => {
    const wrapper = mountItem(choiceTask, 0, {});
    await wrapper.find('input[type="radio"][value="Yes"]').setValue();
    expect(wrapper.emitted('save')).toEqual([['0-0', 'Yes']]);
  });
});
