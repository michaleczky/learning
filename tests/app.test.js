// Integration tests for the App component: loading the worksheet index
// from data/ and hash-based routing between the list and the viewer.
// The data/ fetches are served by MSW; the app must never hit a real origin.

import { mount, flushPromises } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';
import { vi } from 'vitest';
import App from '../public/js/components/App.js';
import testWorksheet from '../public/data/test-worksheet.json';
import { server } from './mocks/server.js';

// Registered per-test: the global setup's afterEach calls server.resetHandlers(),
// which would drop handlers registered once in beforeAll after the first test.
beforeEach(() => {
  server.use(
    http.get('*/data/index.json', () =>
      HttpResponse.json({ Test: ['test-worksheet.json'] })
    ),
    http.get('*/data/test-worksheet.json', () =>
      HttpResponse.json(testWorksheet)
    )
  );
});

afterEach(() => {
  if (location.hash) location.hash = '';
});

describe('App worksheet loading', () => {
  it('shows the worksheet list after loading data/index.json', async () => {
    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.vm.worksheets).toHaveLength(1);
    expect(wrapper.vm.worksheets[0].id).toBe('test-worksheet');
    expect(wrapper.find('.card').attributes('href')).toBe('#/test-worksheet');
    expect(wrapper.find('h1').text()).toBe('Feladatlapok');
  });

  it('also accepts an array-shaped worksheet index', async () => {
    server.use(
      http.get('*/data/index.json', () => HttpResponse.json(['test-worksheet.json']))
    );
    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.vm.worksheets).toHaveLength(1);
  });
});

describe('App hash routing', () => {
  it('routes to the worksheet and back to the list on hash change', async () => {
    const wrapper = mount(App);
    await flushPromises();

    location.hash = '#/test-worksheet';
    window.dispatchEvent(new Event('hashchange'));
    await flushPromises();

    expect(wrapper.vm.currentWorksheet?.id).toBe('test-worksheet');
    expect(wrapper.find('h1').text()).toBe('Test Worksheet');
    expect(wrapper.find('.toolbar').exists()).toBe(true);

    location.hash = '';
    window.dispatchEvent(new Event('hashchange'));
    await flushPromises();

    expect(wrapper.vm.currentWorksheet).toBeNull();
    expect(wrapper.find('h1').text()).toBe('Feladatlapok');
  });

  it('stays on the list for an unknown worksheet id', async () => {
    const wrapper = mount(App);
    await flushPromises();

    location.hash = '#/does-not-exist';
    window.dispatchEvent(new Event('hashchange'));
    await flushPromises();

    expect(wrapper.vm.currentWorksheet).toBeNull();
    expect(wrapper.find('.card').exists()).toBe(true);
  });

  it('removes the hashchange listener on unmount', async () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const wrapper = mount(App);
    await flushPromises();

    wrapper.unmount();

    expect(removeSpy).toHaveBeenCalledWith('hashchange', expect.any(Function));
    removeSpy.mockRestore();
  });
});
