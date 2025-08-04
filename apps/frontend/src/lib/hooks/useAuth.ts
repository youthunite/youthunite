import { authStore } from '$lib/stores/auth.svelte.js';
import { onMount } from 'svelte';

export function useAuth() {
  onMount(() => {
    authStore.init();
  });

  return authStore;
}