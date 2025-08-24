<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import User from '@lucide/svelte/icons/user';
  import LogOut from '@lucide/svelte/icons/log-out';
  import { useAuth } from '$lib/hooks/useAuth';
  import type UserInterface from '$lib/types/user';

  let currentPath = $state('/');
  let links = [
    { href: '/', label: 'Home' },
    { href: '/events', label: 'Event Hub' },
    { href: '/events/register', label: 'Submit an Event' },
    { href: '/learn', label: 'Learn' },
    { href: '/contact', label: 'Contact us' },
  ];
  let serverUser: UserInterface | null = $state(null);

  const auth = useAuth();
  let mobileOpen = $state(false);

  const currentUser = $derived(serverUser || auth.user);
  const isAuthenticated = $derived(!!serverUser || auth.isAuthenticated);
  const isLoading = $derived(!serverUser && auth.isLoading);

  const isActive = (href: string) =>
    href === '/' ? currentPath === '/' : currentPath.startsWith(href);

  const handleLogout = async () => {
    await auth.logout();
    window.location.href = '/';
  };
</script>

<header class="sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <div class="mx-auto flex h-16 items-center justify-between px-4 max-w-screen-2xl">
    <!-- Hamburger for mobile -->
    <Button class="lg:hidden" onclick={() => mobileOpen = !mobileOpen}>
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
    </Button>

  
    <nav class="hidden lg:flex gap-4" aria-label="Primary">
      {#each links as link}
        <a href={link.href} class="px-3 py-2 rounded-md text-sm font-medium
          {isActive(link.href) ? 'text-primary' : 'text-muted-foreground'}
          hover:bg-accent hover:text-accent-foreground">{link.label}</a>
      {/each}
    </nav>


    <div class="flex items-center gap-2">
      {#if isLoading}
        <div class="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      {:else if isAuthenticated && currentUser}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="ghost" class="h-9 px-3 gap-2">
              <User class="h-4 w-4" />
              <span class="hidden sm:inline">{currentUser.name}</span>
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" class="w-56">
            <DropdownMenu.Label>
              <div class="flex flex-col space-y-1">
                <p class="text-sm font-medium">{currentUser.name}</p>
                <p class="text-xs text-muted-foreground">{currentUser.email}</p>
              </div>
            </DropdownMenu.Label>
            <DropdownMenu.Separator />
            <DropdownMenu.Item>
              <a href="/dashboard" class="flex w-full items-center"><User class="mr-2 h-4 w-4" /> Dashboard</a>
            </DropdownMenu.Item>
            <DropdownMenu.Item>
              <a href="/profile" class="flex w-full items-center"><User class="mr-2 h-4 w-4" /> Profile</a>
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onclick={handleLogout}>
              <LogOut class="mr-2 h-4 w-4" /> Log out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {:else}
        <a href="/login"><Button variant="ghost" class="hidden sm:inline-flex h-9 px-3">Log in</Button></a>
        <a href="/register"><Button variant="outline" class="hidden sm:inline-flex h-9 px-4 sm:h-10 sm:px-5">Sign up</Button></a>
      {/if}
    </div>
  </div>


  <div class={`fixed inset-0 z-50 bg-black/40 backdrop-blur transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} on:click={() => mobileOpen = false}></div>
  <div class={`fixed top-0 left-0 h-full w-64 bg-background shadow-lg transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
    <div class="p-4 flex flex-col gap-4">
      {#each links as link}
        <a href={link.href} class="px-3 py-2 rounded-md text-sm font-mediuma
          {isActive(link.href) ? 'text-primary' : 'text-muted-foreground'}"
          on:click={() => mobileOpen = false}>{link.label}</a>
      {/each}
    </div>
  </div>
</header>