<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Sheet from '$lib/components/ui/sheet';
  import { Mountain, Menu, icons } from '@lucide/svelte';
  import Icon from '../assets/icon.svg';

  export let currentPath: string = '/';
  export let links: { href: string; label: string }[] = [
    { href: '/', label: 'Home' },
    { href: '/hub', label: 'Event Hub' },
    { href: '/submit', label: 'Submit an Event' },
    { href: '/learn', label: 'Learn' },
    { href: '/contact', label: 'Contact us' },
  ];

  const isActive = (href: string) =>
    href === '/' ? currentPath === '/' : currentPath.startsWith(href);
</script>

<header
  class="sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
  <div
    class="mx-auto flex h-16 items-center justify-between px-3 sm:px-4 lg:px-6 xl:px-8 2xl:px-10 max-w-screen-2xl"
  >
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2.5">
        <Sheet.Root>
          <Sheet.Trigger>
            <Button
              variant="outline"
              size="icon"
              class="lg:hidden bg-transparent h-10 w-10"
              aria-label="Open navigation menu"
            >
              <Menu class="h-5 w-5" />
            </Button>
          </Sheet.Trigger>
          <Sheet.Content side="left" class="w-80">
            <div class="p-4">
              <div class="flex items-center gap-2 mb-6">
                <img src={Icon.src} alt="YouthUnite Logo" class="size-8" />
                <span class="font-semibold">YouthUnite</span>
              </div>
              <nav class="grid gap-2">
                {#each links as link}
                  <a
                    href={link.href}
                    class="rounded px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    aria-current={isActive(link.href) ? 'page' : undefined}
                  >
                    {link.label}
                  </a>
                {/each}
              </nav>
              <div class="mt-6">
                <Button class="w-full" variant="default">Join Now</Button>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.Root>

        <a href="/" class="flex items-center gap-2" aria-label="Go to homepage">
          <img src={Icon.src} alt="YouthUnite Logo" class="size-8" />
          <span class="font-semibold tracking-tight hidden sm:inline">YouthUnite</span>
          <span class="sr-only">YouthUnite</span>
        </a>
      </div>
      <nav class="hidden lg:flex ml-4 gap-1" aria-label="Primary">
        {#each links as link}
          <a
            href={link.href}
            class="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 {isActive(
              link.href
            )
              ? 'text-primary'
              : 'text-muted-foreground'}"
            aria-current={isActive(link.href) ? 'page' : undefined}
          >
            {link.label}
          </a>
        {/each}
      </nav>
    </div>

    <div class="flex items-center gap-2 sm:gap-3">
      <a href="/login">
      <Button variant="ghost" class="hidden sm:inline-flex h-9 px-3">Log in</Button>
      </a>
      <a href="/register">
        <Button variant="outline" class="hidden sm:inline-flex h-9 px-4 sm:h-10 sm:px-5">
          Sign up
        </Button>
      </a>
    </div>
  </div>
</header>
