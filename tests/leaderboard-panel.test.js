// Unit tests for the LeaderboardPanel component: activation through the
// active prop, loading the npoint.io leaderboard for a configured worksheet,
// reloading when the version prop is bumped, and the status messages for
// empty and unconfigured leaderboards.
// HTTP is served by MSW (see mocks/handlers.js), with per-test overrides.

import { mount, flushPromises } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';
import LeaderboardPanel from '../public/js/components/LeaderboardPanel.js';
import { server } from './mocks/server.js';

const worksheet = { id: 'ws1', title: 'Ws1', npointEndpoint: 'https://api.npoint.io/ep1' };

const items = [
  { name: 'Anna', score: 5, max: 10, createdAt: '2026-09-01T10:00:00.000Z' },
  { name: 'Béla', score: 7, max: 10, createdAt: '2026-09-01T09:00:00.000Z' }
];

function mountPanel(ws = worksheet) {
  return mount(LeaderboardPanel, { props: { worksheet: ws } });
}

describe('LeaderboardPanel activation', () => {
  it('starts hidden with an invitation status', () => {
    const wrapper = mountPanel();
    expect(wrapper.find('section').classes()).toContain('hidden');
    expect(wrapper.text()).toContain('Kattints a Ranglista gombra');
  });

  it('shows when activated and hides when deactivated', async () => {
    const wrapper = mountPanel();

    await wrapper.setProps({ active: true });
    await flushPromises();
    expect(wrapper.find('section').classes()).not.toContain('hidden');

    await wrapper.setProps({ active: false });
    expect(wrapper.find('section').classes()).toContain('hidden');
  });
});

describe('LeaderboardPanel loading', () => {
  it('renders submissions sorted by score descending', async () => {
    server.use(http.get('https://api.npoint.io/ep1', () => HttpResponse.json(items)));
    const wrapper = mountPanel();

    await wrapper.setProps({ active: true });
    await flushPromises();

    const rows = wrapper.findAll('.leaderboard-list li');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Béla');
    expect(rows[0].text()).toContain('7 / 10');
    expect(rows[0].find('.rank').text()).toBe('1.');
    expect(rows[1].find('.rank').text()).toBe('2.');
    expect(wrapper.vm.statusMessage).toBe('');
  });

  it('reports when nobody has submitted yet', async () => {
    server.use(http.get('https://api.npoint.io/ep1', () => HttpResponse.json([])));
    const wrapper = mountPanel();

    await wrapper.setProps({ active: true });
    await flushPromises();

    expect(wrapper.vm.statusMessage).toBe('Még senki nem töltötte ki ezt a feladatlapot.');
    expect(wrapper.findAll('.leaderboard-list li')).toHaveLength(0);
  });

  it('does not fetch and reports the panel as unconfigured without an endpoint', async () => {
    // MSW fails tests on unhandled requests, so a fetch here would error out.
    const wrapper = mountPanel({ id: 'plain', title: 'Plain' });

    await wrapper.setProps({ active: true });
    await flushPromises();

    expect(wrapper.vm.statusMessage).toContain('A ranglista nincs beállítva');
    expect(wrapper.vm.submissions).toEqual([]);
  });

  it('reloads while active when the version prop is bumped', async () => {
    server.use(http.get('https://api.npoint.io/ep1', () => HttpResponse.json(items)));
    const wrapper = mountPanel();

    await wrapper.setProps({ active: true });
    await flushPromises();
    expect(wrapper.vm.submissions).toHaveLength(2);

    server.use(http.get('https://api.npoint.io/ep1', () => HttpResponse.json([])));
    await wrapper.setProps({ version: 1 });
    await flushPromises();

    expect(wrapper.vm.submissions).toEqual([]);
    expect(wrapper.vm.statusMessage).toBe('Még senki nem töltötte ki ezt a feladatlapot.');
  });

  it('formats the submission date as a localized string', () => {
    const wrapper = mountPanel();
    const formatted = wrapper.vm.formatDate('2026-09-01T10:00:00.000Z');
    expect(formatted).toContain('2026');
    expect(formatted).not.toBe('2026-09-01T10:00:00.000Z');
    expect(wrapper.vm.formatDate('')).toBe('');
  });
});
