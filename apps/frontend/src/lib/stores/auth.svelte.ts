interface User {
  id: string;
  name: string;
  email: string;
  tier: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const isBrowser = typeof window !== 'undefined';

class AuthStore {
  #state = $state<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false
  });

  get user() {
    return this.#state.user;
  }

  get isLoading() {
    return this.#state.isLoading;
  }

  get isAuthenticated() {
    return this.#state.isAuthenticated;
  }

  async login(email: string, password: string) {
    try {
      const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.success && isBrowser) {
        document.cookie = `jwt_token=${data.jwt_token}; Max-Age=86400; Secure; Path=/; SameSite=Lax`;
        await this.fetchUser();
        return { success: true };
      }
      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async fetchUser() {
    if (!isBrowser) {
      this.#state.isLoading = false;
      return;
    }

    const token = this.token;
    if (!token) {
      this.#state.user = null;
      this.#state.isLoading = false;
      this.#state.isAuthenticated = false;
      return;
    }

    this.#state.isLoading = true;

    try {
      const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.#state.user = data.user;
        this.#state.isLoading = false;
        this.#state.isAuthenticated = true;
      } else {
        document.cookie = 'jwt_token=; Max-Age=0; path=/; domain=' + window.location.hostname;
        this.#state.user = null;
        this.#state.isLoading = false;
        this.#state.isAuthenticated = false;
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      this.#state.user = null;
      this.#state.isLoading = false;
      this.#state.isAuthenticated = false;
    }
  }

  async logout() {
    if (!isBrowser) return;
    
    if (this.token) {
      try {
        await fetch(`${import.meta.env.PUBLIC_API_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jwt_token: this.token })
        }).then(async (response) => {
          console.log(await response.json())
          if (!response.ok) {
            throw new Error('Logout failed');
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
      
      document.cookie = 'jwt_token=; Max-Age=0; path=/; domain=' + window.location.hostname;
    }
    
    this.#state.user = null;
    this.#state.isLoading = false;
    this.#state.isAuthenticated = false;
  }

  async init() {
    await this.fetchUser();
  }

  get token() {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('jwt_token='))
      ?.split('=')[1];
  }

  async requestPasswordReset(email: string) {
    try {
      const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async resetPassword(token: string, password: string) {
    try {
      const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async validateResetToken(token: string) {
    try {
      const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/auth/validate-reset-token/${token}`);
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }
}

export const authStore = new AuthStore();