// Unit tests for the SubmissionsPanel component: toggle visibility and
// listing the submission URLs recorded in localStorage, with copying
// handled through a stubbed clipboard API.

import { mount, flushPromises } from '@vue/test-utils';
import { vi } from 'vitest';
import SubmissionsPanel from '../public/js/components/SubmissionsPanel.js';
import { saveSubmission } from '../public/js/utils.js';

const worksheetId = 'ws1';

const writeText = vi.fn();

function mountPanel(id = worksheetId) {
  return mount(SubmissionsPanel, { props: { worksheetId: id } });
}

beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText }
  });
});

beforeEach(() => {
  localStorage.clear();
  writeText.mockClear();
});

describe('SubmissionsPanel toggle', () => {
  it('starts hidden with an invitation status', () => {
    const wrapper = mountPanel();
    expect(wrapper.find('section').classes()).toContain('hidden');
    expect(wrapper.text()).toContain('Kattints a Beküldött feladatok gombra');
  });

  it('shows on first toggle and hides on the second', async () => {
    const wrapper = mountPanel();

    await wrapper.vm.toggle();
    await flushPromises();
    expect(wrapper.find('section').classes()).not.toContain('hidden');

    await wrapper.vm.toggle();
    expect(wrapper.find('section').classes()).toContain('hidden');
  });
});

describe('SubmissionsPanel listing', () => {
  it('renders saved submissions with their share URLs', async () => {
    saveSubmission(worksheetId, 'https://api.npoint.io/doc1', 'Anna');
    const wrapper = mountPanel();

    await wrapper.vm.toggle();
    await flushPromises();

    const items = wrapper.findAll('.submission-item');
    expect(items).toHaveLength(1);
    expect(items[0].text()).toContain('1. beküldés');
    expect(items[0].text()).toContain('Anna');
    expect(items[0].find('input').element.value).toBe('https://api.npoint.io/doc1');
    expect(wrapper.vm.statusMessage).toBe('');
  });

  it('lists only the submissions of the current worksheet', async () => {
    saveSubmission(worksheetId, 'https://api.npoint.io/doc1', 'Anna');
    saveSubmission('other', 'https://api.npoint.io/doc2', 'Péter');
    const wrapper = mountPanel();

    await wrapper.vm.toggle();
    await flushPromises();

    expect(wrapper.findAll('.submission-item')).toHaveLength(1);
    expect(wrapper.find('input').element.value).toBe('https://api.npoint.io/doc1');
  });

  it('shows an empty-state message for a worksheet without submissions', async () => {
    saveSubmission('other', 'https://api.npoint.io/doc2', 'Péter');
    const wrapper = mountPanel();

    await wrapper.vm.toggle();
    await flushPromises();

    expect(wrapper.find('.submissions-list .muted').text())
      .toContain('Még nem küldtél be válaszokat');
    expect(wrapper.findAll('.submission-item')).toHaveLength(0);
  });

  it('copies the URL to the clipboard when the input is clicked', async () => {
    saveSubmission(worksheetId, 'https://api.npoint.io/doc1', 'Anna');
    const wrapper = mountPanel();

    await wrapper.vm.toggle();
    await flushPromises();

    await wrapper.find('input').trigger('click');

    expect(writeText).toHaveBeenCalledWith('https://api.npoint.io/doc1');
  });
});
