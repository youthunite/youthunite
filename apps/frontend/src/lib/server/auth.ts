interface User {
  id: string;
  name: string;
  email: string;
  tier: string;
}

export async function getServerUser(token: string | undefined): Promise<User | null> {
  if (!token) return null;

  try {
    const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.user;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch user server-side:', error);
    return null;
  }
}

export function getTokenFromCookie(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  
  return cookies.jwt_token;
}