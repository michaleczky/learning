// npoint.io API client: all HTTP calls to npoint.io live here.
// Which document to use for each worksheet is configured in
// config.js; this module only talks to the network.

import { npointApiUrl, getEndpointForWorksheet, isNpointConfigured } from '../config.js';

// Submit a new submission to the leaderboard
export async function submitToNpoint(submission, worksheet) {
  const endpoint = getEndpointForWorksheet(worksheet);
  if (!isNpointConfigured(worksheet)) {
    console.warn('npoint.io is not configured for this worksheet. Add leaderboardNpointDocId to the worksheet JSON.');
    return;
  }

  try {
    // First, get current submissions
    const response = await fetch(endpoint);
    let submissions = [];

    if (response.ok) {
      submissions = await response.json();
      if (!Array.isArray(submissions)) {
        submissions = [];
      }
    }

    // Add new submission with timestamp
    const newSubmission = {
      ...submission,
      createdAt: new Date().toISOString()
    };
    submissions.push(newSubmission);

    // Post updated array back
    const postResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissions)
    });

    if (!postResponse.ok) {
      throw new Error(`Failed to save: ${postResponse.status}`);
    }

    return newSubmission;
  } catch (err) {
    console.error('Error submitting to npoint.io:', err);
    throw err;
  }
}

// Create a new empty npoint.io document and return its document ID.
// Note: POSTing to https://api.npoint.io/ does NOT create documents (it
// returns 500). Documents are created via the website's own route, which
// needs no authentication or CSRF token.
async function createNpointDocument() {
  const response = await fetch('https://www.npoint.io/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    throw new Error(`Failed to create document: ${response.status}`);
  }

  const doc = await response.json();
  if (!doc.api_url) {
    throw new Error('npoint.io did not return a document URL');
  }
  // Keep only the document ID (the last path segment of the API URL).
  return doc.api_url.split('/').pop();
}

// Save student answers to a new npoint.io document and return its document ID.
// Returns null on error.
export async function saveAnswersToNpoint(worksheet, answers, studentName) {
  try {
    const data = {
      worksheetId: worksheet.id,
      worksheetTitle: worksheet.title,
      studentName: studentName,
      answers: answers,
      savedAt: new Date().toISOString()
    };

    // Create a new document, then fill it with the answers
    const docId = await createNpointDocument();

    const response = await fetch(npointApiUrl(docId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to save: ${response.status}`);
    }

    return docId;
  } catch (err) {
    console.error('Error saving answers to npoint.io:', err);
    return null;
  }
}

// Load a submitted answers document (the teacher view of a student's Check).
// Throws on HTTP errors; callers handle the failure.
export async function fetchSubmission(docId) {
  const response = await fetch(npointApiUrl(docId));
  if (!response.ok) {
    throw new Error(`Failed to load: ${response.status}`);
  }
  return response.json();
}

// Load submissions for a specific worksheet
export async function loadSubmissionsFromNpoint(worksheet) {
  const endpoint = getEndpointForWorksheet(worksheet);
  if (!isNpointConfigured(worksheet)) {
    return null;
  }

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Failed to load: ${response.status}`);
    }

    const submissions = await response.json();
    if (!Array.isArray(submissions)) {
      return [];
    }

    // Sort by score descending, then by date ascending
    return submissions
      .sort((a, b) => b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, 20); // Limit to top 20
  } catch (err) {
    console.error('Error loading from npoint.io:', err);
    return null;
  }
}
