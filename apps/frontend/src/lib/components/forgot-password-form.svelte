<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { toast } from 'svelte-sonner';
  import { authStore } from '$lib/stores/auth.svelte.js';

  let isSubmitting = $state(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const email = (form.querySelector('input[type="email"]') as HTMLInputElement).value;

    isSubmitting = true;
    
    try {
      const result = await authStore.requestPasswordReset(email);
      
      if (result.success) {
        toast.success('Password reset instructions sent to your email');
        (form.querySelector('input[type="email"]') as HTMLInputElement).value = '';
      } else {
        toast.error(result.error || 'Failed to send reset email');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again later.');
      console.error('Error during password reset request:', error);
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
    <p class="mt-4 text-gray-600">Reset your password to continue your journey of change.</p>

    <div class="mt-10 space-y-6">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center">🔒</div>
        <span class="text-gray-800">Secure Password Reset</span>
      </div>
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center">📧</div>
        <span class="text-gray-800">Email Instructions</span>
      </div>
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center">⚡</div>
        <span class="text-gray-800">Quick & Easy</span>
      </div>
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center">🛡️</div>
        <span class="text-gray-800">Account Security</span>
      </div>
    </div>
  </div>

  <div class="w-1/2 flex items-center justify-center bg-white px-4">
    <Card.Root class="w-full max-w-md shadow-lg rounded-lg">
      <Card.Header>
        <Card.Title class="text-2xl font-semibold">Forgot Password</Card.Title>
        <Card.Description>Enter your email to receive reset instructions</Card.Description>
      </Card.Header>
      <Card.Content>
        <form class="grid gap-4" onsubmit={submit}>
          <div class="grid gap-2">
            <Label for="email-{id}">Email address</Label>
            <Input id="email-{id}" type="email" placeholder="m@example.com" required />
          </div>
          <Button type="submit" class="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Reset Instructions'}
          </Button>
        </form>
        <div class="mt-4 text-center text-sm">
          Remember your password?
          <a href="/login{typeof window !== 'undefined' && window.location.search ? window.location.search : ''}" class="underline text-[#e46a2d]">Sign in here</a>
        </div>
        <p class="mt-6 text-center text-xs text-gray-500">
          Need help? Contact us at <a href="mailto:team.youthunite@gmail.com" class="underline">team.youthunite@gmail.com</a>
        </p>
      </Card.Content>
    </Card.Root>
  </div>
</div>