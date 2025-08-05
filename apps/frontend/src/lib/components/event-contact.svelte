<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { cn } from '$lib/utils';
  import { buttonVariants } from './ui/button/button.svelte';
  
  let props = $props();
  let open = $state(false);
  
  // Form state
  let firstName = $state('');
  let lastName = $state('');
  let email = $state('');
  let phone = $state('');
  let age = $state('');
  let additionalInfo = $state('');
  
  function handleSubmit(event: Event) {
    event.preventDefault();
    const subject = encodeURIComponent('Event Interest - ' + firstName + ' ' + lastName);
    const body = encodeURIComponent(
      `Hi,\n\nevent interest blah blah blah\n\n` +
      `contact Information:\n` +
      `Name: ${firstName} ${lastName}\n` +
      `Email: ${email}\n` +
      `Phone: ${phone}\n` +
      `Age: ${age}\n\n` +
      `Additional Information:\n${additionalInfo}\n\n` +
      `please get back to me with more details.\n\n` +
      `best regards,\n${firstName}`
    );
    
    window.location.href = `mailto:${props.email}?subject=${subject}&body=${body}`;
  }
</script>

<Dialog.Root>
  <Dialog.Trigger 
    class={cn(buttonVariants({ variant: 'default' }), 'w-full')}
    onclick={() => console.log('Dialog trigger clicked')}
  >
    I'm Interested ✏️
  </Dialog.Trigger>
  <Dialog.Portal>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Get Involved!</Dialog.Title>
      <Dialog.Description>
        Fill out this form and we'll send an email to the event organizer with your information.
      </Dialog.Description>
    </Dialog.Header>
    
    <form class="space-y-4" on:submit={handleSubmit}>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="firstName">First name</Label>
          <Input 
            id="firstName" 
            type="text" 
            placeholder="John" 
            bind:value={firstName}
            required
          />
        </div>
        <div class="space-y-2">
          <Label for="lastName">Last name</Label>
          <Input 
            id="lastName" 
            type="text" 
            placeholder="Doe" 
            bind:value={lastName}
            required
          />
        </div>
      </div>
      
      <div class="space-y-2">
        <Label for="email">Email</Label>
        <Input 
          id="email" 
          type="email" 
          placeholder="john@example.com" 
          bind:value={email}
          required
        />
      </div>
      
      <div class="space-y-2">
        <Label for="phone">Phone number</Label>
        <Input 
          id="phone" 
          type="tel" 
          placeholder="+1 (555) 123-4567" 
          bind:value={phone}
          required
        />
      </div>
      
      <div class="space-y-2">
        <Label for="age">Age</Label>
        <Input 
          id="age" 
          type="number" 
          placeholder="18" 
          min="13"
          max="99"
          bind:value={age}
          required
        />
      </div>
      
      <div class="space-y-2">
        <Label for="additionalInfo">Additional information (Optional)</Label>
        <Textarea 
          id="additionalInfo" 
          placeholder="Tell us more about yourself and why you're interested in this event..."
          rows={3}
          bind:value={additionalInfo}
        />
      </div>
      
      <Button 
        type="submit" 
        class="w-full bg-[var(--orange-primary)] hover:bg-[var(--orange-light)] text-white"
      >
        Submit
      </Button>
    </form>
  </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
