/**
 * Utility for safe API calls and JSON response parsing.
 * Prevents "Unexpected token 'T' / '<'" syntax errors when server returns HTML error pages.
 */
export async function parseJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  let data = null;
  if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Ignore JSON parse failure, fallback below
    }
  }

  if (!response.ok) {
    if (data && data.error) {
      throw new Error(data.error);
    }
    if (response.status === 404) {
      throw new Error('API endpoint not found. Please ensure the backend server is running on port 5000.');
    }
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error('Backend server is offline or unreachable on port 5000.');
    }
    if (text.includes('<title>')) {
      const match = text.match(/<title>(.*?)<\/title>/i);
      if (match && match[1]) {
        throw new Error(`Server error: ${match[1].trim()}`);
      }
    }
    throw new Error(`Server error (${response.status}). Please check backend server status.`);
  }

  if (data === null) {
    throw new Error('Server returned non-JSON response. Please ensure backend server is active on port 5000.');
  }

  return data;
}

export async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    return await parseJsonResponse(response);
  } catch (err) {
    if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
      throw new Error('Network error: Unable to connect to the backend server. Please verify port 5000 is running.');
    }
    throw err;
  }
}
