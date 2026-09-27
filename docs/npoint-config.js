// npoint.io configuration: which document belongs to which worksheet.
// This is the only user-editable file of the npoint.io integration.
// The HTTP calls live in js/npoint-api.js.
// 
// Each worksheet can have its own leaderboard, configured in the worksheet
// JSON as `leaderboardNpointDocId` (the document ID from the npoint.io API
// URL). Alternatively, set a default document ID below.
//
// To create a leaderboard for a worksheet:
//   Visit https://www.npoint.io and create a new document in the editor
//   Copy its API URL (e.g., https://api.npoint.io/xxxx-xxxx)
//   Add its document ID to your worksheet JSON: "leaderboardNpointDocId": "xxxx-xxxx"

// Default document ID (used if worksheet doesn't have its own). Leave empty to
// disable the leaderboard for worksheets without a leaderboardNpointDocId.
export const DEFAULT_NPOINT_DOC_ID = "";

// API URL of an npoint.io document. Accepts a bare document ID, or a full
// URL for values saved before the switch to IDs.
export function npointApiUrl(docIdOrUrl) {
  return /^https?:\/\//.test(docIdOrUrl) ? docIdOrUrl : `https://api.npoint.io/${docIdOrUrl}`;
}

// Get the leaderboard endpoint URL for a specific worksheet ("" if unconfigured)
export function getEndpointForWorksheet(worksheet) {
  const docId = worksheet?.leaderboardNpointDocId || DEFAULT_NPOINT_DOC_ID;
  return docId ? npointApiUrl(docId) : "";
}

// Helper to check if npoint.io is configured
export function isNpointConfigured(worksheet) {
  return !!getEndpointForWorksheet(worksheet);
}
