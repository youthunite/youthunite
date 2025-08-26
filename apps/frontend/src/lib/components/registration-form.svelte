<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { toast } from 'svelte-sonner';

  const submit = (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const username = (form.querySelector('input[type="text"]') as HTMLInputElement).value;
    const email = (form.querySelector('input[type="email"]') as HTMLInputElement).value;
    let password = (form.querySelector('input[type="password"]') as HTMLInputElement).value;

    fetch(`${import.meta.env.PUBLIC_API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: username, email, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // cookie string from https://lucia-auth.com/sessions/basic
          document.cookie = `jwt_token=${data.jwt_token}; Age=86400; Secure; Path=/; SameSite=Lax`;
          
          // redirect param checking
          const urlParams = new URLSearchParams(window.location.search);
          const redirectPath = urlParams.get('redirect');
          
          if (redirectPath) {
            window.location.href = redirectPath;
          } else {
            window.location.href = '/dashboard';
          }
        } else {
          toast.error('Registration failed. Please check your credentials.');
        }
      })
      .catch(error => {
        toast.error('An error occurred during registration. Please try again later.');
        console.error('Error during registration:', error);
      });
  }

  const id = $props.id();
</script>

<div class="flex h-screen w-full">

  <div class="w-1/2 bg-[#e8f4f5] flex flex-col justify-center px-16">
    <h1 class="text-3xl font-bold">
      Welcome to <span class="text-[#e46a2d]">Youth</span><span class="text-[#1b355e]">UNITE</span>
    </h1>
    <p class="mt-4 text-gray-600">Create your account to continue your journey of change.</p>

    <div class="mt-10 space-y-6">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center">📚</div>
        <span class="text-gray-800">Mini-Courses</span>
      </div>
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center">🚀</div>
        <span class="text-gray-800">Launch Campaigns</span>
      </div>
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center">🎯</div>
        <span class="text-gray-800">Get Experience</span>
      </div>
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center">🤝</div>
        <span class="text-gray-800">Meet Changemakers</span>
      </div>
    </div>
  </div>


  <div class="w-1/2 flex items-center justify-center px-4">
    <Card.Root class="mx-auto w-full max-w-sm">
      <Card.Header>
        <Card.Title class="text-2xl">Sign Up</Card.Title>
        <Card.Description>Enter your email below to create a new account</Card.Description>
      </Card.Header>
      <Card.Content>
        <form class="grid gap-4" onsubmit={submit}>
          <div class="grid gap-2">
            <Label for="username-{id}">Username</Label>
            <Input id="username-{id}" type="text" placeholder="johndoe" required />
          </div>
          <div class="grid gap-2">
            <Label for="email-{id}">Email</Label>
            <Input id="email-{id}" type="email" placeholder="m@example.com" required />
          </div>
          <div class="grid gap-2">
            <Label for="password-{id}">Password</Label>
            <Input id="password-{id}" type="password" placeholder="Enter your password" required />
          </div>
          <Button type="submit" class="w-full">Sign Up</Button>
        </form>
        <div class="mt-4 text-center text-sm">
          Already have an account?
          <a href="/login{typeof window !== 'undefined' && window.location.search ? window.location.search : ''}" class="underline"> Log in! </a>
        </div>
      </Card.Content>
    </Card.Root>
  </div>
</div>
