// Unit tests for the TaskControl component: the input rendered for each
// task type, and the two-way binding through the computed selectedValue
// (value prop in, 'update' event out).

import { mount } from '@vue/test-utils';
import TaskControl from '../public/js/components/TaskControl.js';

function mountControl(task, { value = '', ti = 0, ii = 0 } = {}) {
  return mount(TaskControl, { props: { task, ti, ii, value } });
}

describe('TaskControl rendering by task type', () => {
  it('renders one radio per choice option, all sharing the item key as name', () => {
    const task = { type: 'choice', options: ['Yes', 'No', 'Maybe'] };
    const wrapper = mountControl(task, { ti: 2, ii: 1 });

    const radios = wrapper.findAll('input[type="radio"]');
    expect(radios).toHaveLength(3);
    radios.forEach(radio => expect(radio.attributes('name')).toBe('2-1'));
    radios.forEach((radio, i) => expect(radio.attributes('value')).toBe(task.options[i]));
  });

  it('renders a select with a placeholder option for select tasks', () => {
    const task = { type: 'select', options: ['Red', 'Green', 'Blue'] };
    const wrapper = mountControl(task);

    const options = wrapper.findAll('select option');
    expect(options).toHaveLength(4);
    expect(options[0].attributes('value')).toBe('');
    expect(options[1].text()).toBe('Red');
    expect(wrapper.find('select').element.value).toBe('');
  });

  it('renders a text input for text tasks', () => {
    const wrapper = mountControl({ type: 'text', items: [] }, { value: 'four' });
    const input = wrapper.find('input[type="text"]');
    expect(input.exists()).toBe(true);
    expect(input.element.value).toBe('four');
  });

  it('renders a textarea for open tasks', () => {
    const wrapper = mountControl({ type: 'open', items: [] }, { value: 'I like dogs' });
    const textarea = wrapper.find('textarea');
    expect(textarea.exists()).toBe(true);
    expect(textarea.element.value).toBe('I like dogs');
  });

  it('renders an error message for unknown task types', () => {
    const wrapper = mountControl({ type: 'gap' });
    expect(wrapper.find('.error').text()).toBe('Ismeretlen feladattípus: gap');
  });

  it('treats an undefined value as an empty string', () => {
    const wrapper = mountControl({ type: 'text', items: [] }, { value: undefined });
    expect(wrapper.find('input[type="text"]').element.value).toBe('');
  });
});

describe('TaskControl readonly mode', () => {
  it('disables every control type when readonly is set', () => {
    const task = { type: 'choice', options: ['Yes', 'No'] };
    const radioWrapper = mount(TaskControl, { props: { task, ti: 0, ii: 0, value: '', readonly: true } });
    radioWrapper.findAll('input[type="radio"]').forEach(radio =>
      expect(radio.element.disabled).toBe(true)
    );

    const selectWrapper = mount(TaskControl, {
      props: { task: { type: 'select', options: ['Red'] }, ti: 0, ii: 0, value: '', readonly: true }
    });
    expect(selectWrapper.find('select').element.disabled).toBe(true);

    const textWrapper = mount(TaskControl, {
      props: { task: { type: 'text', items: [] }, ti: 0, ii: 0, value: '', readonly: true }
    });
    expect(textWrapper.find('input[type="text"]').element.disabled).toBe(true);

    const openWrapper = mount(TaskControl, {
      props: { task: { type: 'open', items: [] }, ti: 0, ii: 0, value: '', readonly: true }
    });
    expect(openWrapper.find('textarea').element.disabled).toBe(true);
  });

  it('leaves controls enabled by default', () => {
    const wrapper = mountControl({ type: 'text', items: [] });
    expect(wrapper.find('input[type="text"]').element.disabled).toBe(false);
  });
});

describe('TaskControl two-way binding', () => {
  it('emits update with ti, ii and the chosen option for choice tasks', async () => {
    const task = { type: 'choice', options: ['Yes', 'No'] };
    const wrapper = mountControl(task, { ti: 1, ii: 2 });

    await wrapper.find('input[type="radio"][value="No"]').setValue();

    expect(wrapper.emitted('update')).toEqual([[1, 2, 'No']]);
  });

  it('emits update when a select option is chosen', async () => {
    const task = { type: 'select', options: ['Red', 'Green'] };
    const wrapper = mountControl(task);

    await wrapper.find('select').setValue('Green');

    expect(wrapper.emitted('update')).toEqual([[0, 0, 'Green']]);
  });

  it('emits update while typing in a text input', async () => {
    const wrapper = mountControl({ type: 'text', items: [] });

    const input = wrapper.find('input[type="text"]');
    input.element.value = '4';
    await input.trigger('input');

    expect(wrapper.emitted('update')).toEqual([[0, 0, '4']]);
  });

  it('emits update when a textarea changes', async () => {
    const wrapper = mountControl({ type: 'open', items: [] });

    const textarea = wrapper.find('textarea');
    textarea.element.value = 'my answer';
    await textarea.trigger('input');

    expect(wrapper.emitted('update')).toEqual([[0, 0, 'my answer']]);
  });
});
