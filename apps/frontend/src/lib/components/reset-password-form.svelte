<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { toast } from 'svelte-sonner';
  import { authStore } from '$lib/stores/auth.svelte.js';
  import { onMount } from 'svelte';

  let isSubmitting = $state(false);
  let isValidating = $state(true);
  let tokenValid = $state(false);
  let password = $state('');
  let confirmPassword = $state('');

  const { token } = $props<{ token: string }>();

  onMount(async () => {
    if (token) {
      const result = await authStore.validateResetToken(token);
      tokenValid = result.success;
      isValidating = false;
      
      if (!result.success) {
        toast.error('Invalid or expired reset token');
      }
    } else {
      isValidating = false;
      toast.error('No reset token provided');
    }
  });

  const submit = async (e: Event) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    isSubmitting = true;
    
    try {
      const result = await authStore.resetPassword(token, password);
      
      if (result.success) {
        window.location.href = '/login';
      } else {
        toast.error(result.error || 'Failed to reset password');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again later.');
      console.error('Error during password reset:', error);
    } finally {
      isSubmitting = false;
    }
  }

  const id = $props.id();
</script>

<div class="flex h-screen w-full">
  <div class="w-1/2 bg-[#e8f4f5] flex flex-col justify-center px-16">
    <h1 class="text-3xl font-bold">
      Welcome to <span class="text-[#e46a2d]">Youth</span><span class="text-[#1b355e]">UNITE</span>
    </h1>
    <p class="mt-4 text-gray-600">Set your new password to continue your journey of change.</p>

    <div class="mt-10 space-y-6">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center">🔐</div>
        <span class="text-gray-800">New Secure Password</span>
      </div>
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center">✅</div>
        <span class="text-gray-800">Account Recovery</span>
      </div>
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center">🚀</div>
        <span class="text-gray-800">Continue Your Journey</span>
      </div>
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center">🛡️</div>
        <span class="text-gray-800">Enhanced Security</span>
      </div>
    </div>
  </div>

  <div class="w-1/2 flex items-center justify-center bg-white px-4">
    <Card.Root class="w-full max-w-md shadow-lg rounded-lg">
      <Card.Header>
        <Card.Title class="text-2xl font-semibold">Reset Password</Card.Title>
        <Card.Description>Enter your new password below</Card.Description>
      </Card.Header>
      <Card.Content>
        {#if isValidating}
          <div class="text-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e46a2d] mx-auto"></div>
            <p class="mt-2 text-sm text-gray-600">Validating reset token...</p>
          </div>
        {:else if !tokenValid}
          <div class="text-center py-8">
            <div class="text-red-500 text-lg mb-2">❌</div>
            <p class="text-red-600 font-medium">Invalid or Expired Token</p>
            <p class="text-sm text-gray-600 mt-2">This password reset link is no longer valid.</p>
            <div class="mt-4">
              <a href="/forgot-password" class="inline-block px-4 py-2 bg-[#e46a2d] text-white rounded-md text-sm hover:bg-[#d15a24] transition-colors">
                Request New Reset Link
              </a>
            </div>
          </div>
        {:else}
          <form class="grid gap-4" onsubmit={submit}>
            <div class="grid gap-2">
              <Label for="password-{id}">New Password</Label>
              <Input 
                id="password-{id}" 
                type="password" 
                placeholder="Enter your new password" 
                bind:value={password}
                required 
                minlength=8
              />
              <p class="text-xs text-gray-500">Must be at least 8 characters long</p>
            </div>
            <div class="grid gap-2">
              <Label for="confirm-password-{id}">Confirm Password</Label>
              <Input 
                id="confirm-password-{id}" 
                type="password" 
                placeholder="Confirm your new password" 
                bind:value={confirmPassword}
                required 
                minlength=8
              />
            </div>
            <Button type="submit" class="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        {/if}
        
        <div class="mt-4 text-center text-sm">
          Remember your password?
          <a href="/login" class="underline text-[#e46a2d]">Sign in here</a>
        </div>
        <p class="mt-6 text-center text-xs text-gray-500">
          Need help? Contact us at <a href="mailto:team.youthunite@gmail.com" class="underline">team.youthunite@gmail.com</a>
        </p>
      </Card.Content>
    </Card.Root>
  </div>
</div>