// Test setup: start the MSW server (intercepts all fetch calls),
// replace Node 25's inert localStorage stub with a real jsdom Storage,
// and reset captured requests between tests.

import { JSDOM } from 'jsdom';
import { server } from './mocks/server.js';
import { resetCaptures } from './mocks/handlers.js';

// Node >= 25 defines globalThis.localStorage as an inert stub that shadows
// jsdom's Storage inside the test environment; swap in a working one.
globalThis.localStorage = new JSDOM('', { url: 'http://localhost:8000/' }).window.localStorage;
globalThis.confirm = () => true;
// jsdom does not implement scrollIntoView; panels call it when toggled open.
globalThis.HTMLElement.prototype.scrollIntoView = () => {};

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(() => {
  resetCaptures();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
