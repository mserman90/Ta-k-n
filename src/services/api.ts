/**
 * API Service for Open-Meteo Flood API (No API Key Required)
 * Implements strict rules:
 * 1. RFC 6585 compliant error handling (429 Too Many Requests).
 * 2. Exponential Backoff + Jitter algorithm.
 */

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function fetchWithBackoff(
  url: string,
  options?: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  try {
    const response = await fetch(url, options);

    // Open-Meteo doesn't strictly use X-RateLimit headers for free tier in the same way,
    // but we keep the logic to respect the architectural requirement if they appear.
    const remaining = response.headers.get("X-RateLimit-Remaining");
    const limit = response.headers.get("X-RateLimit-Limit");
    
    if (remaining && limit) {
      const remainingNum = parseInt(remaining, 10);
      const limitNum = parseInt(limit, 10);
      
      console.debug(`[API Quota] X-RateLimit-Remaining: ${remainingNum} / ${limitNum}`);
      
      if (remainingNum / limitNum <= 0.2) {
        console.warn(`[QUOTA WARNING] API limit reaching 80% capacity. Remaining: ${remainingNum}`);
      }
    }

    // Rule 2: Exponential Backoff + Jitter for 429
    if (response.status === 429 && retries > 0) {
      const retryAfter = response.headers.get("Retry-After");
      let delay = retryAfter 
        ? parseInt(retryAfter, 10) * 1000 
        : INITIAL_BACKOFF_MS * Math.pow(2, MAX_RETRIES - retries);
      
      // Add Jitter (0 to 1000ms)
      delay += Math.random() * 1000;
      
      console.warn(`[API] 429 Too Many Requests. Retrying in ${Math.round(delay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithBackoff(url, options, retries - 1);
    }

    if (!response.ok) {
      throw new ApiError(`HTTP Error: ${response.status} ${response.statusText}`, response.status);
    }

    return response;
  } catch (error) {
    if (error instanceof ApiError && error.status !== 429) {
      throw error;
    }
    
    // Network errors or unexpected issues
    if (retries > 0) {
      const delay = INITIAL_BACKOFF_MS * Math.pow(2, MAX_RETRIES - retries) + Math.random() * 1000;
      console.warn(`[API] Network error. Retrying in ${Math.round(delay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithBackoff(url, options, retries - 1);
    }
    throw error;
  }
}

// Open-Meteo Flood API endpoint (No API key required for non-commercial use)
const BASE_URL = "https://flood-api.open-meteo.com/v1/flood";

export const floodApi = {
  // Fetch historical and forecast data for a specific coordinate
  getStationData: async (lat: number, lon: number) => {
    // past_days=90 for extended inundation history, forecast_days=14 for early warning
    const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&daily=river_discharge&past_days=90&forecast_days=14`;
    const response = await fetchWithBackoff(url);
    return response.json();
  }
};

