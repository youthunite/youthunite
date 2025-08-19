<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { toast } from 'svelte-sonner';

  let firstName = $state('');
  let lastName = $state('');
  let email = $state('');
  let question = $state('');
  let isSubmitting = $state(false);

  async function handleSubmit(ev: Event) {
    ev.preventDefault();
    if (!firstName || !lastName || !email || !question) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    isSubmitting = true;

    try {
      const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          question
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      toast.success('Message sent successfully!');
      
      // Clear form
      firstName = '';
      lastName = '';
      email = '';
      question = '';
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="w-full max-w-md mx-auto">
  <form onsubmit={handleSubmit} class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label for="firstName">First Name</Label>
        <Input
          id="firstName"
          type="text"
          bind:value={firstName}
          placeholder="Enter your first name"
          required
        />
      </div>
      <div class="space-y-2">
        <Label for="lastName">Last Name</Label>
        <Input
          id="lastName"
          type="text"
          bind:value={lastName}
          placeholder="Enter your last name"
          required
        />
      </div>
    </div>

    <div class="space-y-2">
      <Label for="email">Email</Label>
      <Input
        id="email"
        type="email"
        bind:value={email}
        placeholder="Enter your email address"
        required
      />
    </div>

    <div class="space-y-2">
      <Label for="question">Question</Label>
      <Textarea
        id="question"
        bind:value={question}
        placeholder="Enter your question or message"
        rows={6}
        required
      />
    </div>

    <Button
      type="submit"
      disabled={isSubmitting}
      class="w-full"
    >
      {isSubmitting ? 'Sending...' : 'Send'}
    </Button>
  </form>
</div>
