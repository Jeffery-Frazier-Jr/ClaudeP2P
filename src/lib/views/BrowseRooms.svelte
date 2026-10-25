<script lang="ts">
  import { core, CoreError, type RoomListing } from '../core';
  import { plural } from '../format';
  import { app, errorText } from '../state/app.svelte';
  import CreateRoomDialog from '../components/CreateRoomDialog.svelte';
  import Icon from '../components/Icon.svelte';
  import PasswordDialog from '../components/PasswordDialog.svelte';
  import RoomCard from '../components/RoomCard.svelte';

  type VisibilityFilter = 'all' | 'public' | 'friends';
  type Sort = 'newest' | 'most' | 'fewest';

  let query = $state('');
  let visibility = $state<VisibilityFilter>('all');
  let openOnly = $state(false);
  let noPassword = $state(false);
  let sort = $state<Sort>('newest');

  let createOpen = $state(false);
  let joiningId = $state<string | null>(null);
  let passwordRoom = $state<RoomListing | null>(null);
  let passwordError = $state('');

  const filtersActive = $derived(query.trim() !== '' || visibility !== 'all' || openOnly || noPassword);

  const rooms = $derived.by(() => {
    const q = query.trim().toLowerCase().replace(/^#/, '');
    const list = app.listings.filter((room) => {
      if (visibility !== 'all' && room.visibility !== visibility) return false;
      if (openOnly && room.memberCount >= room.limit) return false;
      if (noPassword && room.hasPassword) return false;
      if (!q) return true;
      return (
        room.title.toLowerCase().includes(q) ||
        room.owner.nickname.toLowerCase().includes(q) ||
        room.owner.tag.toLowerCase().includes(q)
      );
    });
    if (sort === 'most') return list.toSorted((a, b) => b.memberCount - a.memberCount);
    if (sort === 'fewest') return list.toSorted((a, b) => a.memberCount - b.memberCount);
    return list;
  });

  function clearFilters() {
    query = '';
    visibility = 'all';
    openOnly = false;
    noPassword = false;
  }

  function join(room: RoomListing) {
    if (room.hasPassword) {
      passwordError = '';
      passwordRoom = room;
      return;
    }
    attemptJoin(room, null);
  }

  async function attemptJoin(room: RoomListing, password: string | null) {
    joiningId = room.id;
    try {
      await core.joinRoom(room.id, password);
      passwordRoom = null;
    } catch (e) {
      if (e instanceof CoreError && e.code === 'wrong_password') {
        passwordError = e.message;
      } else {
        passwordRoom = null;
        app.toast('error', errorText(e));
      }
    } finally {
      joiningId = null;
    }
  }

  const inRoom = $derived(app.session !== null && app.session.phase !== 'closed');
</script>

<section class="view">
  <header class="header">
    <Icon name="globe" size={20} />
    <h2>Browse rooms</h2>
    <span class="divider" aria-hidden="true"></span>
    <span class="subtitle">
      {#if app.directory === 'online'}
        {plural(app.listings.length, 'room', 'rooms')} waiting to start
      {:else}
        Rooms leave this list the moment they start
      {/if}
    </span>
    <div class="header-end">
      <span class={['status', app.directory]} role="status">
        <span class="status-dot" aria-hidden="true"></span>
        {app.directory === 'online' ? 'Directory online' : app.directory === 'connecting' ? 'Connecting…' : 'Directory offline'}
      </span>
      <button
        class="btn btn-primary btn-sm"
        type="button"
        disabled={app.directory !== 'online' || inRoom}
        title={inRoom ? 'Leave your current room first' : undefined}
        onclick={() => (createOpen = true)}
      >
        <Icon name="plus" size={16} />Create room
      </button>
    </div>
  </header>

  <div class="toolbar">
    <label class="search">
      <Icon name="search" size={16} />
      <span class="sr-only">Search rooms</span>
      <input bind:value={query} placeholder="Search by room, nickname or #tag" />
      {#if query}
        <button class="clear" type="button" aria-label="Clear search" onclick={() => (query = '')}>
          <Icon name="x" size={14} />
        </button>
      {/if}
    </label>

    <div class="segmented" role="radiogroup" aria-label="Visibility">
      {#each [['all', 'All'], ['public', 'Public'], ['friends', 'Friends']] as const as [value, label] (value)}
        <label class={['segment', { selected: visibility === value }]}>
          <input type="radio" name="vis" {value} bind:group={visibility} class="sr-only" />
          {label}
        </label>
      {/each}
    </div>

    <button class={['chip', { on: openOnly }]} type="button" aria-pressed={openOnly} onclick={() => (openOnly = !openOnly)}>
      {#if openOnly}<Icon name="check" size={14} />{/if}Has space
    </button>
    <button class={['chip', { on: noPassword }]} type="button" aria-pressed={noPassword} onclick={() => (noPassword = !noPassword)}>
      {#if noPassword}<Icon name="check" size={14} />{/if}No password
    </button>

    <label class="sort">
      <span class="sr-only">Sort</span>
      <select bind:value={sort}>
        <option value="newest">Newest</option>
        <option value="most">Most people</option>
        <option value="fewest">Fewest people</option>
      </select>
    </label>
  </div>

  <div class="content">
    {#if app.directory === 'offline'}
      <div class="state">
        <span class="state-icon danger"><Icon name="offline" size={28} /></span>
        <h3>Can't reach the room directory</h3>
        <p>
          The directory is only used to find and start rooms. Rooms that already started keep working
          without it.
        </p>
        <button class="btn btn-secondary" type="button" onclick={() => core.reconnectDirectory()}>
          <Icon name="refresh" size={16} />Try again
        </button>
      </div>
    {:else if app.directory === 'connecting'}
      <div class="grid" aria-busy="true" aria-label="Loading rooms">
        {#each Array(6) as _, i (i)}
          <div class="skeleton"></div>
        {/each}
      </div>
    {:else if rooms.length === 0 && filtersActive}
      <div class="state">
        <span class="state-icon"><Icon name="search" size={28} /></span>
        <h3>No rooms match</h3>
        <p>Try a different search, or loosen the filters.</p>
        <button class="btn btn-secondary" type="button" onclick={clearFilters}>Clear filters</button>
      </div>
    {:else if rooms.length === 0}
      <div class="state">
        <span class="state-icon"><Icon name="chat" size={28} /></span>
        <h3>No rooms waiting right now</h3>
        <p>Create one. Others will see it here until you start it.</p>
        <button class="btn btn-primary" type="button" disabled={inRoom} onclick={() => (createOpen = true)}>
          <Icon name="plus" size={16} />Create room
        </button>
      </div>
    {:else}
      <div class="grid">
        {#each rooms as room (room.id)}
          <RoomCard
            {room}
            isYours={room.owner.id === app.me?.id}
            joining={joiningId === room.id}
            disabled={inRoom || joiningId !== null}
            onjoin={join}
            onopen={() => (app.view = 'room')}
          />
        {/each}
      </div>
    {/if}
  </div>
</section>

<CreateRoomDialog open={createOpen} onclose={() => (createOpen = false)} />
<PasswordDialog
  room={passwordRoom}
  busy={joiningId !== null}
  error={passwordError}
  onsubmit={(password) => passwordRoom && attemptJoin(passwordRoom, password)}
  onclose={() => (passwordRoom = null)}
/>

<style>
  .view {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
  }

  .header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: var(--header-height);
    padding: 0 var(--space-4);
    border-bottom: 1px solid var(--divider);
    box-shadow: 0 1px 0 rgb(0 0 0 / 0.15);
    color: var(--text-muted);
    flex-shrink: 0;
  }
  h2 {
    font-size: var(--text-lg);
    color: var(--text);
  }
  .divider {
    width: 1px;
    height: 24px;
    margin: 0 var(--space-2);
    background: var(--border);
  }
  .subtitle {
    font-size: var(--text-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .header-end {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-left: auto;
    flex-shrink: 0;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-xs);
    font-weight: 600;
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-faint);
  }
  .status.online .status-dot {
    background: var(--success);
    box-shadow: 0 0 0 3px var(--success-soft);
  }
  .status.connecting .status-dot {
    background: var(--warning);
    animation: pulse 1.2s ease-in-out infinite;
  }
  .status.offline {
    color: #f58b8d;
  }
  .status.offline .status-dot {
    background: var(--danger);
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4) var(--space-6) 0;
  }

  .search {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 1 1 260px;
    max-width: 420px;
    height: 36px;
    padding: 0 var(--space-3);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    background: var(--bg-sunken);
    color: var(--text-faint);
  }
  .search:focus-within {
    border-color: var(--accent);
  }
  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: none;
  }
  .search input:focus {
    outline: none;
  }
  .search input::placeholder {
    color: var(--text-faint);
  }
  .clear {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--bg-active);
    color: var(--text-muted);
    cursor: pointer;
  }

  .segmented {
    display: inline-flex;
    padding: 3px;
    border-radius: var(--radius-md);
    background: var(--bg-sunken);
  }
  .segment {
    display: grid;
    place-items: center;
    height: 30px;
    padding: 0 var(--space-3);
    border-radius: 6px;
    color: var(--text-muted);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
  }
  .segment:hover {
    color: var(--text);
  }
  .segment.selected {
    background: var(--bg-active);
    color: var(--text);
  }
  .segment:has(:focus-visible) {
    outline: 2px solid var(--focus-ring);
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 32px;
    padding: 0 var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--text-muted);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color var(--fast) ease,
      border-color var(--fast) ease,
      color var(--fast) ease;
  }
  .chip:hover {
    border-color: var(--border-strong);
    color: var(--text);
  }
  .chip.on {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--text);
  }

  .sort select {
    height: 32px;
    padding: 0 var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-main);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4) var(--space-6) var(--space-8);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-3);
  }

  .skeleton {
    height: 132px;
    border-radius: var(--radius-lg);
    background: linear-gradient(90deg, var(--bg-raised) 0%, var(--bg-raised-hover) 50%, var(--bg-raised) 100%);
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
  }

  .state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    max-width: 380px;
    margin: 72px auto 0;
    text-align: center;
  }
  .state h3 {
    font-size: var(--text-xl);
  }
  .state p {
    color: var(--text-muted);
    margin-bottom: var(--space-2);
  }
  .state-icon {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--bg-raised);
    color: var(--text-muted);
  }
  .state-icon.danger {
    background: var(--danger-soft);
    color: #f58b8d;
  }

  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
  @keyframes pulse {
    50% {
      opacity: 0.4;
    }
  }

  @media (max-width: 860px) {
    .subtitle,
    .divider {
      display: none;
    }
  }
</style>
