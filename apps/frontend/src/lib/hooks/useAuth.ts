import { authStore, user, isAuthenticated, isLoading } from '$lib/stores/auth';
import { onMount } from 'svelte';

export function useAuth() {
  onMount(() => {
    authStore.init();
  });

  return {
    user,
    isAuthenticated,
    isLoading,
    login: authStore.login,
    logout: authStore.logout,
    fetchUser: authStore.fetchUser
  };
}