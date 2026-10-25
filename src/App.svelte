<script lang="ts">
  import DevPanel from './lib/components/DevPanel.svelte';
  import Rail from './lib/components/Rail.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import Toasts from './lib/components/Toasts.svelte';
  import { app } from './lib/state/app.svelte';
  import BrowseRooms from './lib/views/BrowseRooms.svelte';
  import RoomView from './lib/views/RoomView.svelte';

  const DEV_KEY = 'claudep2p.devPanel';

  // Browser storage can be unavailable; the panel just starts open then.
  function readDevOpen(): boolean {
    try {
      return localStorage.getItem(DEV_KEY) !== 'closed';
    } catch {
      return true;
    }
  }

  let devOpen = $state(import.meta.env.DEV && readDevOpen());

  function toggleDev() {
    devOpen = !devOpen;
    try {
      localStorage.setItem(DEV_KEY, devOpen ? 'open' : 'closed');
    } catch {
      // Not important enough to report.
    }
  }
</script>

<div class="shell">
  <Rail {devOpen} ontoggledev={toggleDev} />
  <Sidebar />
  <main class="main">
    {#if app.view === 'room' && app.session}
      <RoomView session={app.session} />
    {:else}
      <BrowseRooms />
    {/if}
  </main>
</div>

<Toasts />

{#if import.meta.env.DEV && devOpen}
  <DevPanel onclose={toggleDev} />
{/if}

<style>
  .shell {
    display: flex;
    height: 100%;
  }
  .main {
    flex: 1;
    min-width: 0;
    background: var(--bg-main);
  }
</style>
