// MSW handlers for the npoint.io API, mirroring the real endpoints:
//   GET  https://www.npoint.io/            -> homepage HTML with CSRF meta tag
//   POST https://www.npoint.io/documents   -> creates a document, returns api_url
//   POST https://api.npoint.io/<id>        -> writes document contents
//   GET/POST https://api.npoint.io/ep1     -> per-worksheet leaderboard endpoint

import { http, HttpResponse } from 'msw';

export const captures = {
  createdDocuments: [], // headers sent to POST /documents
  savedBodies: [],      // bodies POSTed to created documents
  leaderboardPosts: []  // bodies POSTed to the leaderboard endpoint
};

export function resetCaptures() {
  captures.createdDocuments.length = 0;
  captures.savedBodies.length = 0;
  captures.leaderboardPosts.length = 0;
}

export const leaderboardItems = [
  { name: 'B', score: 1, createdAt: '2026-09-01T00:00:00.000Z' }
];

export const npointHandlers = [
  http.get('https://www.npoint.io/', () =>
    HttpResponse.html('<meta name="csrf-token" content="tok123">')
  ),

  http.post('https://www.npoint.io/documents', ({ request }) => {
    captures.createdDocuments.push({ csrfToken: request.headers.get('X-CSRF-Token') });
    return HttpResponse.json({ api_url: 'https://api.npoint.io/created1' });
  }),

  http.post('https://api.npoint.io/created1', async ({ request }) => {
    captures.savedBodies.push(await request.json());
    return new HttpResponse(null, { status: 200 });
  }),

  http.get('https://api.npoint.io/ep1', () =>
    HttpResponse.json(leaderboardItems)
  ),

  http.post('https://api.npoint.io/ep1', async ({ request }) => {
    captures.leaderboardPosts.push(await request.json());
    return new HttpResponse(null, { status: 200 });
  })
];
