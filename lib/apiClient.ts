import { auth } from './firebase';

/**
 * API client helper that automatically attaches Firebase ID token to requests
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  
  // Get Firebase ID token if user is authenticated
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      headers.set('Authorization', `Bearer ${token}`);
    } catch (error) {
      console.error('Failed to get ID token:', error);
    }
  }

  // Set Content-Type for JSON if body is provided and not already set
  if (options.body && !headers.get('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api/${endpoint}`, {
    ...options,
    headers,
  });

  return response;
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: (endpoint: string, options?: RequestInit) =>
    apiRequest(endpoint, { ...options, method: 'GET' }),
  
  post: (endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  delete: (endpoint: string, options?: RequestInit) =>
    apiRequest(endpoint, { ...options, method: 'DELETE' }),
  
  put: (endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
};

