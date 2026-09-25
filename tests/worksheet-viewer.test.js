// Integration test for worksheet answer persistence and rendering.
// Mounts the real WorksheetViewer component with @vue/test-utils (jsdom)
// and asserts saved answers are loaded from localStorage and rendered.

import { mount, flushPromises } from '@vue/test-utils';
import WorksheetViewer from '../public/js/components/WorksheetViewer.js';
import worksheet from '../public/data/test-worksheet.json';
import { captures } from './mocks/handlers';

const storageKey = 'learning:test-worksheet';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(storageKey, JSON.stringify({ '0-0': 'Yes', '1-0': '4' }));
});

function mountViewer() {
  return mount(WorksheetViewer, { props: { worksheet } });
}

describe('WorksheetViewer answer persistence', () => {
  it('loads saved answers from localStorage on mount', async () => {
    const wrapper = mountViewer();
    await flushPromises();

    expect(wrapper.vm.answers['0-0']).toBe('Yes');
    expect(wrapper.vm.answers['1-0']).toBe('4');
  });

  it('renders saved answers into the controls', async () => {
    const wrapper = mountViewer();
    await flushPromises();

    const radio = wrapper.find('input[type="radio"][value="Yes"]');
    expect(radio.element.checked).toBe(true);

    const textInput = wrapper.find('.item input[type="text"]');
    expect(textInput.element.value).toBe('4');
  });

  it('persists a new answer to localStorage and keeps previous ones', async () => {
    const wrapper = mountViewer();
    await flushPromises();

    wrapper.vm.onSaveAnswer('0-1', 'No');
    await flushPromises();

    const stored = JSON.parse(localStorage.getItem(storageKey));
    expect(stored['0-1']).toBe('No');
    expect(stored['0-0']).toBe('Yes');
  });

  it('saves answers to npoint.io when Check is clicked', async () => {
    const wrapper = mountViewer();
    await flushPromises();

    await wrapper.vm.check();
    await flushPromises();

    expect(captures.createdDocuments).toHaveLength(1);
    expect(captures.createdDocuments[0].csrfToken).toBe('tok123');
    expect(captures.savedBodies).toHaveLength(1);
    expect(captures.savedBodies[0].worksheetId).toBe('test-worksheet');
    expect(captures.savedBodies[0].answers).toEqual({ '0-0': 'Yes', '1-0': '4' });
  });

  it('stores the returned share URL and records the submission', async () => {
    const wrapper = mountViewer();
    await flushPromises();
    wrapper.vm.studentName = 'Anna'; // shareUrl is only shown for named students
    await flushPromises();

    await wrapper.vm.check();
    await flushPromises();

    expect(wrapper.vm.shareUrl).toBe('https://api.npoint.io/created1');

    const submissions = JSON.parse(localStorage.getItem('learning:submissions'));
    expect(submissions['test-worksheet'][0].url).toBe('https://api.npoint.io/created1');
    expect(submissions['test-worksheet'][0].name).toBe('Anna');
  });
});
