// Integration tests for the npoint.io integration: the API client
// (docs/js/api.js) and the configuration (docs/config.js).
// All HTTP is handled by MSW (see mocks/handlers.js).

import { http, HttpResponse } from 'msw';
import { vi } from 'vitest';
import * as api from '../docs/js/api.js';
import * as cfg from '../docs/config.js';
import { server } from './mocks/server.js';
import { captures, leaderboardItems } from './mocks/handlers.js';

const worksheet = {
  id: 'ws1',
  title: 'Test Worksheet',
  leaderboardNpointDocId: 'ep1'
};

describe('saveAnswersToNpoint', () => {
  it('creates a document and saves the answers into it', async () => {
    const docId = await api.saveAnswersToNpoint(worksheet, { '0-0': 'Yes' }, 'Anna');

    expect(docId).toBe('created1');
    expect(captures.createdDocuments).toEqual([{}]);

    const saved = captures.savedBodies[0];
    expect(saved.worksheetId).toBe('ws1');
    expect(saved.studentName).toBe('Anna');
    expect(saved.answers).toEqual({ '0-0': 'Yes' });
    expect(typeof saved.savedAt).toBe('string');
    expect(Number.isNaN(Date.parse(saved.savedAt))).toBe(false);
  });

  it('returns null when document creation fails', async () => {
    server.use(
      http.post('https://www.npoint.io/documents', () =>
        HttpResponse.json({}, { status: 500 })
      )
    );
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const docId = await api.saveAnswersToNpoint(worksheet, { '0-0': 'Yes' }, 'Anna');

    expect(docId).toBeNull();
    expect(captures.savedBodies).toHaveLength(0);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('submitToNpoint', () => {
  it('appends the new submission to the existing ones and posts the array', async () => {
    const sub = await api.submitToNpoint({ name: 'A', score: 5, max: 10 }, worksheet);

    expect(sub.name).toBe('A');
    expect(sub.score).toBe(5);
    expect(typeof sub.createdAt).toBe('string');

    const posted = captures.leaderboardPosts[0];
    expect(posted).toHaveLength(2);
    expect(posted[0].name).toBe(leaderboardItems[0].name);
    expect(posted[1].name).toBe('A');
  });
});

describe('loadSubmissionsFromNpoint', () => {
  it('sorts by score descending and caps at 20 entries', async () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      name: `s${i}`,
      score: i,
      createdAt: '2026-09-01T00:00:00.000Z'
    }));
    server.use(
      http.get('https://api.npoint.io/ep1', () => HttpResponse.json(items))
    );

    const subs = await api.loadSubmissionsFromNpoint(worksheet);

    expect(subs).toHaveLength(20);
    expect(subs[0].score).toBe(24);
    expect(subs[19].score).toBe(5);
  });
});

describe('fetchSubmission', () => {
  it('loads the answers document by its ID', async () => {
    server.use(
      http.get('https://api.npoint.io/sub1', () =>
        HttpResponse.json({ studentName: 'Anna', answers: { '0-0': 'Yes' } })
      )
    );

    const data = await api.fetchSubmission('sub1');

    expect(data.studentName).toBe('Anna');
    expect(data.answers).toEqual({ '0-0': 'Yes' });
  });

  it('throws when the document cannot be loaded', async () => {
    server.use(
      http.get('https://api.npoint.io/sub1', () => new HttpResponse(null, { status: 404 }))
    );

    await expect(api.fetchSubmission('sub1')).rejects.toThrow('Failed to load: 404');
  });
});

describe('endpoint configuration', () => {
  it('falls back to the default document when the worksheet has none', () => {
    expect(cfg.getEndpointForWorksheet({ id: 'x' })).toBe('');
    expect(cfg.getEndpointForWorksheet(worksheet)).toBe('https://api.npoint.io/ep1');
    expect(cfg.isNpointConfigured(worksheet)).toBe(true);
  });

  it('reports worksheets without an endpoint as unconfigured', () => {
    expect(cfg.DEFAULT_NPOINT_DOC_ID).toBe('');
    expect(cfg.isNpointConfigured({ id: 'x' })).toBe(false);
    expect(cfg.isNpointConfigured(null)).toBe(false);
  });

  it('builds API URLs from bare document IDs and passes full URLs through', () => {
    expect(cfg.npointApiUrl('abc123')).toBe('https://api.npoint.io/abc123');
    expect(cfg.npointApiUrl('https://api.npoint.io/abc123')).toBe('https://api.npoint.io/abc123');
  });
});
