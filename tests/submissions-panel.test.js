// Unit tests for the SubmissionsPanel component: toggle visibility and
// listing the submissions recorded in localStorage, each with a clickable
// link that opens the filled worksheet in the read-only teacher view,
// plus copying handled through a stubbed clipboard API.

import { mount, flushPromises } from '@vue/test-utils';
import { vi } from 'vitest';
import SubmissionsPanel from '../public/js/components/SubmissionsPanel.js';
import { saveSubmission } from '../public/js/utils.js';

const worksheetId = 'ws1';

const writeText = vi.fn();

function mountPanel(id = worksheetId) {
  return mount(SubmissionsPanel, { props: { worksheetId: id } });
}

function expectedLink(url) {
  return `http://localhost:3000/#/view-submission?ws=${worksheetId}&answers=${encodeURIComponent(url)}`;
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
  it('renders each submission as a link that opens the filled worksheet', async () => {
    saveSubmission(worksheetId, 'https://api.npoint.io/doc1', 'Anna');
    const wrapper = mountPanel();

    await wrapper.vm.toggle();
    await flushPromises();

    const items = wrapper.findAll('.submission-item');
    expect(items).toHaveLength(1);
    expect(items[0].text()).toContain('1. beküldés');
    expect(items[0].text()).toContain('Anna');

    const link = items[0].find('a.submission-link');
    expect(link.attributes('href')).toBe(expectedLink('https://api.npoint.io/doc1'));
    expect(link.attributes('target')).toBe('_blank');
    expect(link.text()).toBe(link.attributes('href'));
    expect(wrapper.vm.statusMessage).toBe('');
  });

  it('lists only the submissions of the current worksheet', async () => {
    saveSubmission(worksheetId, 'https://api.npoint.io/doc1', 'Anna');
    saveSubmission('other', 'https://api.npoint.io/doc2', 'Péter');
    const wrapper = mountPanel();

    await wrapper.vm.toggle();
    await flushPromises();

    const links = wrapper.findAll('a.submission-link');
    expect(links).toHaveLength(1);
    expect(links[0].attributes('href')).toBe(expectedLink('https://api.npoint.io/doc1'));
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

  it('copies the teacher-view link when Másolás is clicked', async () => {
    saveSubmission(worksheetId, 'https://api.npoint.io/doc1', 'Anna');
    const wrapper = mountPanel();

    await wrapper.vm.toggle();
    await flushPromises();

    await wrapper.find('.url-container button').trigger('click');

    expect(writeText).toHaveBeenCalledWith(expectedLink('https://api.npoint.io/doc1'));
  });
});
