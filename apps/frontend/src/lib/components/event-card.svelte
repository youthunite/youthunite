<script lang="ts">
  import Calendar from '@lucide/svelte/icons/calendar';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import User from '@lucide/svelte/icons/user';
  import { Badge } from '$lib/components/ui/badge';
  import { Card, CardContent, CardHeader } from '$lib/components/ui/card';
  import EventContact from './event-contact.svelte';
  let props = $props();
</script>

<Card class="w-full max-w-md shadow-lg">
  <CardHeader class="pb-4">
    <div class="flex items-center gap-3">
        <img
          src={props.icon}
          alt="Event Icon"
          class="w-12 h-12 object-cover rounded-full opacity-50"
        />
      <div>
        <h2 class="text-xl font-semibold text-foreground">{props.title}</h2>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <Badge variant="secondary">
        {props.category}
      </Badge>
    </div>
  </CardHeader>

  <CardContent class="space-y-6">
    <p class="text-muted-foreground text-sm leading-relaxed">
      {props.description}
    </p>

    <div class="grid grid-cols-3 gap-3">
      <div
        class="bg-muted border rounded-lg p-4 flex flex-col items-center text-center"
      >
        <MapPin class="w-6 h-6 text-[var(--blue-light)] mb-2" />
        <div class="space-y-1">
          <p class="text-sm">{props.location}</p>
        </div>
      </div>

      <div
        class="bg-muted border rounded-lg p-4 flex flex-col items-center text-center"
      >
        <Calendar class="w-6 h-6 text-[var(--blue-light)] mb-2" />
        <div class="space-y-1">
          {#if props.date}
            <p class="text-sm">
              {new Date(props.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          {/if}
        </div>
      </div>

      <div
        class="bg-muted border rounded-lg p-4 flex flex-col items-center text-center"
      >
        <User class="w-6 h-6 text-[var(--blue-light)] mb-2" />
        <div class="space-y-1">
          <p class="text-sm">
            Organized by {props.organizer}
          </p>
        </div>
      </div>
    </div>

    {#if props.needs}
      <div>
        <h3 class="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <span class="w-2 h-2 bg-primary rounded-full"></span>
          Current Needs:
        </h3>
        <div class="flex flex-wrap gap-2">
          {#each props.needs as need}
            <Badge variant="outline">
              {need}
            </Badge>
          {/each}
        </div>
      </div>
    {/if}

    <EventContact email={props.email} />
  </CardContent>
</Card>
