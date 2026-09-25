// npoint.io configuration for storing leaderboard submissions
// 
// To set up:
// 1. Create a new document at https://api.npoint.io/ (POST an empty array: [])
// 2. Copy the returned URL and assign it to NPPOINT_ENDPOINT below
// 3. The document should be an array of submission objects
//
// Example setup:
//   POST to https://api.npoint.io/ with body: []
//   You'll get a URL like: https://api.npoint.io/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
//   Set NPPOINT_ENDPOINT to that URL

const NPPOINT_ENDPOINT = "https://www.npoint.io/docs/7709d03254d67966f97f";  // e.g., "https://api.npoint.io/xxxx-xxxx"

// Helper to check if npoint.io is configured
const isNpointConfigured = () => {
  return NPPOINT_ENDPOINT !== "YOUR_NPOINT_URL_HERE" && NPPOINT_ENDPOINT;
};

// Submit a new submission to the leaderboard
async function submitToNpoint(submission) {
  if (!isNpointConfigured()) {
    console.warn('npoint.io is not configured. Set NPPOINT_ENDPOINT in npoint-config.js');
    return;
  }

  try {
    // First, get current submissions
    const response = await fetch(NPPOINT_ENDPOINT);
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
    const postResponse = await fetch(NPPOINT_ENDPOINT, {
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

// Load submissions for a specific worksheet
async function loadSubmissionsFromNpoint(worksheetId) {
  if (!isNpointConfigured()) {
    return null;
  }

  try {
    const response = await fetch(NPPOINT_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Failed to load: ${response.status}`);
    }

    const submissions = await response.json();
    if (!Array.isArray(submissions)) {
      return [];
    }

    // Filter by worksheet and sort
    return submissions
      .filter(s => s.worksheetId === worksheetId)
      .sort((a, b) => b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, 20); // Limit to top 20
  } catch (err) {
    console.error('Error loading from npoint.io:', err);
    return null;
  }
}
