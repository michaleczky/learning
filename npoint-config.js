// npoint.io configuration for storing leaderboard submissions
// 
// Each worksheet can have its own endpoint stored in the worksheet JSON file
// as `npointEndpoint`. Alternatively, set a default central endpoint below.
//
// To create an endpoint for a worksheet:
//   POST to https://api.npoint.io/ with body: []
//   Copy the returned URL (e.g., https://api.npoint.io/xxxx-xxxx)
//   Add it to your worksheet JSON: "npointEndpoint": "https://api.npoint.io/xxxx-xxxx"

// Default endpoint (used if worksheet doesn't have its own)
export const DEFAULT_NPOINT_ENDPOINT = "https://api.npoint.io/7709d03254d67966f97f";  // e.g., "https://api.npoint.io/xxxx-xxxx"

// Get endpoint for a specific worksheet
export function getEndpointForWorksheet(worksheet) {
  return worksheet?.npointEndpoint || DEFAULT_NPOINT_ENDPOINT;
}

// Helper to check if npoint.io is configured
export function isNpointConfigured(worksheet) {
  const endpoint = getEndpointForWorksheet(worksheet);
  return endpoint && endpoint !== "YOUR_NPOINT_URL_HERE";
}

// Submit a new submission to the leaderboard
export async function submitToNpoint(submission, worksheet) {
  const endpoint = getEndpointForWorksheet(worksheet);
  if (!isNpointConfigured(worksheet)) {
    console.warn('npoint.io is not configured for this worksheet. Add npointEndpoint to the worksheet JSON.');
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

// Save student answers to a new npoint.io document and return the URL
// Returns the URL where the answers are stored, or null on error
export async function saveAnswersToNpoint(worksheet, answers, studentName) {
  try {
    const data = {
      worksheetId: worksheet.id,
      worksheetTitle: worksheet.title,
      studentName: studentName,
      answers: answers,
      savedAt: new Date().toISOString()
    };

    // POST to npoint.io API to create a new document
    const response = await fetch('https://api.npoint.io/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to save: ${response.status}`);
    }

    // The response contains the URL where the data is stored
    const result = await response.json();
    return result.url || response.url;
  } catch (err) {
    console.error('Error saving answers to npoint.io:', err);
    return null;
  }
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
