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

describe('WorksheetViewer feedback and solutions', () => {
  it('marks items correct and incorrect after check()', async () => {
    const wrapper = mountViewer();
    await flushPromises();

    const items = wrapper.findAll('.item');
    expect(items[0].classes()).not.toContain('correct');

    await wrapper.vm.check();
    await flushPromises();

    expect(items[0].classes()).toContain('correct');
    expect(items[1].classes()).toContain('incorrect');
    expect(items[1].find('.feedback .bad').exists()).toBe(true);
    expect(items[1].text()).toContain('Nincs válasz.');
    expect(items[1].text()).toContain('No');
  });

  it('renders the self-assessment checkbox for open questions after check()', async () => {
    const wrapper = mountViewer();
    await flushPromises();

    const openItem = wrapper.findAll('.item')[4];
    expect(openItem.find('.selfcheck').exists()).toBe(false);

    await wrapper.vm.check();
    await flushPromises();

    await openItem.find('.selfcheck input').setValue(true);
    await flushPromises();

    expect(JSON.parse(localStorage.getItem(storageKey))['3-0:ok']).toBe(true);
    expect(wrapper.vm.scoreText).toContain('önértékelt: 1 / 1');
  });

  it('shows solutions for every item after reveal()', async () => {
    const wrapper = mountViewer();
    await flushPromises();

    await wrapper.vm.reveal();
    await flushPromises();

    const solutions = wrapper.findAll('.item .solution');
    expect(solutions).toHaveLength(5);
    expect(solutions[0].text()).toContain('Megoldás');
    expect(solutions[4].text()).toContain('Mintamegoldás');
    expect(solutions[4].text()).toContain('I like dogs');
  });
});

describe('WorksheetViewer panel toggling', () => {
  it('toggles the leaderboard panel through reactive state', async () => {
    const wrapper = mountViewer();
    await flushPromises();

    const panel = wrapper.find('.leaderboard-panel');
    expect(panel.classes()).toContain('hidden');

    await wrapper.vm.toggleLeaderboard();
    await flushPromises();

    expect(panel.classes()).not.toContain('hidden');
    // test-worksheet has no npointEndpoint, so the panel reports it is unconfigured
    expect(panel.text()).toContain('A ranglista nincs beállítva');

    await wrapper.vm.toggleLeaderboard();

    expect(panel.classes()).toContain('hidden');
  });

  it('toggles the submissions panel and loads saved submissions', async () => {
    const wrapper = mountViewer();
    await flushPromises();

    const panel = wrapper.find('.submissions-panel');
    expect(panel.classes()).toContain('hidden');

    await wrapper.vm.toggleSubmissions();
    await flushPromises();

    expect(panel.classes()).not.toContain('hidden');
    expect(panel.text()).toContain('Még nem küldtél be válaszokat');
  });
});
