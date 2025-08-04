// cba making this from scratch. ai generated content below:

import { writable, derived, type Readable } from 'svelte/store';

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

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false
  });

  return {
    subscribe,
    login: async (email: string, password: string) => {
      try {
        const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success && isBrowser) {
          localStorage.setItem('jwt_token', data.jwt_token);
          await authStore.fetchUser();
          return { success: true };
        }
        return { success: false, error: 'Invalid credentials' };
      } catch (error) {
        return { success: false, error: 'Network error' };
      }
    },
    
    fetchUser: async () => {
      if (!isBrowser) return;
      
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        set({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }

      update(state => ({ ...state, isLoading: true }));

      try {
        const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          set({
            user: data.user,
            isLoading: false,
            isAuthenticated: true
          });
        } else {
          localStorage.removeItem('jwt_token');
          set({ user: null, isLoading: false, isAuthenticated: false });
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        set({ user: null, isLoading: false, isAuthenticated: false });
      }
    },
    
    logout: async () => {
      if (!isBrowser) return;
      
      const token = localStorage.getItem('jwt_token');
      if (token) {
        try {
          await fetch(`${import.meta.env.PUBLIC_API_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jwt_token: token })
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
        
        localStorage.removeItem('jwt_token');
      }
      
      set({ user: null, isLoading: false, isAuthenticated: false });
    },
    
    init: async () => {
      await authStore.fetchUser();
    }
  };
}

export const authStore = createAuthStore();

export const user: Readable<User | null> = derived(authStore, $auth => $auth.user);
export const isAuthenticated: Readable<boolean> = derived(authStore, $auth => $auth.isAuthenticated);
export const isLoading: Readable<boolean> = derived(authStore, $auth => $auth.isLoading);