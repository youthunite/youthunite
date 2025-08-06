export const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

export function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  
  return cookies.jwt_token || null;
}

export function setAuthToken(token: string) {
  if (typeof document === 'undefined') return;
  
  document.cookie = `jwt_token=${token}; path=/; max-age=${30 * 24 * 60 * 60}`; // 30 days
}

export function removeAuthToken() {
  if (typeof document === 'undefined') return;
  
  document.cookie = 'jwt_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  
  return response.json();
}

export async function loginUser(email: string, password: string) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  if (result.success && result.jwt_token) {
    setAuthToken(result.jwt_token);
  }
  
  return result;
}

export async function logoutUser() {
  const token = getAuthToken();
  if (token) {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ jwt_token: token }),
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
  }
  
  removeAuthToken();
  window.location.href = '/';
}

export async function getCurrentUser() {
  try {
    const result = await apiRequest('/auth/me');
    return result.success ? result.user : null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}
