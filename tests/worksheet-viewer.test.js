// Integration test for worksheet answer persistence and rendering.
// Mounts the real WorksheetViewer component with @vue/test-utils (jsdom)
// and asserts saved answers are loaded from localStorage and rendered.

import { mount, flushPromises } from '@vue/test-utils';
import WorksheetViewer from '../docs/js/components/WorksheetViewer.js';
import worksheet from '../docs/data/test-worksheet.json';
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

  it('shows the teacher-view link in the share box, not the raw API URL', async () => {
    const wrapper = mountViewer();
    await flushPromises();
    wrapper.vm.studentName = 'Anna';
    await flushPromises();

    await wrapper.vm.check();
    await flushPromises();

    expect(wrapper.vm.shareLink).toBe(
      'http://localhost:3000/#/view-submission?ws=test-worksheet&answers=' +
      encodeURIComponent('https://api.npoint.io/created1')
    );
    expect(wrapper.find('.share-url input').element.value).toBe(wrapper.vm.shareLink);
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

// Tab pages are shown/hidden through v-show wrappers around the task list
// and the panels. jsdom caches getComputedStyle results per element, so
// Vue Test Utils' isVisible() returns stale values when a v-show changed
// after a previous visibility query; read the inline style directly.
function isShown(wrapper, selector) {
  const el = wrapper.find(selector).element;
  return el.parentElement.style.display !== 'none' && !el.classList.contains('hidden');
}

describe('WorksheetViewer tab pages', () => {
  it('shows the worksheet by default and hides both panels', async () => {
    const wrapper = mountViewer();
    await flushPromises();

    expect(wrapper.vm.activeTab).toBe('worksheet');
    expect(wrapper.find('.nav-tabs .nav-link').classes()).toContain('active');
    expect(isShown(wrapper, '.task')).toBe(true);
    expect(isShown(wrapper, '.leaderboard-panel')).toBe(false);
    expect(isShown(wrapper, '.submissions-panel')).toBe(false);
  });

  it('switches to the leaderboard tab, which loads the panel', async () => {
    const wrapper = mountViewer();
    await flushPromises();

    const tab = wrapper.findAll('.nav-tabs .nav-link').find(b => b.text() === 'Ranglista');
    await tab.trigger('click');
    await flushPromises();

    expect(wrapper.vm.activeTab).toBe('leaderboard');
    expect(tab.classes()).toContain('active');
    expect(isShown(wrapper, '.leaderboard-panel')).toBe(true);
    // test-worksheet has no npointEndpoint, so the panel reports it is unconfigured
    expect(wrapper.find('.leaderboard-panel').text()).toContain('A ranglista nincs beállítva');
    expect(isShown(wrapper, '.task')).toBe(false);
  });

  it('switches to the submissions tab and back to the worksheet', async () => {
    const wrapper = mountViewer();
    await flushPromises();

    const tabs = wrapper.findAll('.nav-tabs .nav-link');
    await tabs[2].trigger('click');
    await flushPromises();

    expect(wrapper.vm.activeTab).toBe('submissions');
    expect(isShown(wrapper, '.submissions-panel')).toBe(true);
    expect(wrapper.find('.submissions-panel').text()).toContain('Még nem küldtél be válaszokat');

    await tabs[0].trigger('click');
    await flushPromises();

    expect(wrapper.vm.activeTab).toBe('worksheet');
    expect(isShown(wrapper, '.task')).toBe(true);
    expect(isShown(wrapper, '.submissions-panel')).toBe(false);
  });
});
