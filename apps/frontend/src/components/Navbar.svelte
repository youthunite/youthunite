<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Sheet from '$lib/components/ui/sheet';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { Mountain, Menu, User, LogOut } from '@lucide/svelte';
  import Icon from '../assets/icon.svg';
  import { useAuth } from '$lib/hooks/useAuth';

  export let currentPath: string = '/';
  export let links: { href: string; label: string }[] = [
    { href: '/', label: 'Home' },
    { href: '/hub', label: 'Event Hub' },
    { href: '/submit', label: 'Submit an Event' },
    { href: '/learn', label: 'Learn' },
    { href: '/contact', label: 'Contact us' },
  ];

  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const isActive = (href: string) =>
    href === '/' ? currentPath === '/' : currentPath.startsWith(href);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };
</script>

<header
  class="sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
  <div
    class="mx-auto flex h-16 items-center justify-between px-3 sm:px-4 lg:px-6 xl:px-8 2xl:px-10 max-w-screen-2xl"
  >
    <!-- ...existing logo and navigation code... -->
    <div class="flex items-center gap-4">
      <!-- ...existing code... -->
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
      {#if $isLoading}
        <div class="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      {:else if $isAuthenticated && $user}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger let:builder>
            <Button variant="ghost" class="h-9 px-3 gap-2" {...builder}>
              <User class="h-4 w-4" />
              <span class="hidden sm:inline">{$user.name}</span>
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" class="w-56">
            <DropdownMenu.Label>
              <div class="flex flex-col space-y-1">
                <p class="text-sm font-medium">{$user.name}</p>
                <p class="text-xs text-muted-foreground">{$user.email}</p>
              </div>
            </DropdownMenu.Label>
            <DropdownMenu.Separator />
            <DropdownMenu.Item>
              <a href="/dashboard" class="flex w-full items-center">
                <User class="mr-2 h-4 w-4" />
                Dashboard
              </a>
            </DropdownMenu.Item>
            <DropdownMenu.Item>
              <a href="/profile" class="flex w-full items-center">
                <User class="mr-2 h-4 w-4" />
                Profile
              </a>
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onclick={handleLogout}>
              <LogOut class="mr-2 h-4 w-4" />
              Log out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {:else}
        <a href="/login">
          <Button variant="ghost" class="hidden sm:inline-flex h-9 px-3">Log in</Button>
        </a>
        <a href="/register">
          <Button variant="outline" class="hidden sm:inline-flex h-9 px-4 sm:h-10 sm:px-5">
            Sign up
          </Button>
        </a>
      {/if}
    </div>
  </div>
</header>