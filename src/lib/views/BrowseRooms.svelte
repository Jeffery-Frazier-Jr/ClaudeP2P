<script lang="ts">
  import { core, CoreError, type RoomListing } from '../core';
  import { app, errorText } from '../state/app.svelte';
  import CreateRoomMenu from '../components/CreateRoomMenu.svelte';
  import Icon from '../components/Icon.svelte';
  import RoomRow from '../components/RoomRow.svelte';

  type VisibilityFilter = 'all' | 'public' | 'friends';
  type Sort = 'newest' | 'most' | 'fewest';

  let query = $state('');
  let visibility = $state<VisibilityFilter>('all');
  let openOnly = $state(false);
  let noPassword = $state(false);
  let sort = $state<Sort>('newest');

  let joiningId = $state<string | null>(null);
  let askingId = $state<string | null>(null);
  let passwordError = $state('');

  const activeFilters = $derived((visibility !== 'all' ? 1 : 0) + (openOnly ? 1 : 0) + (noPassword ? 1 : 0));
  const inRoom = $derived(app.session !== null && app.session.phase !== 'closed');

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

  function ask(room: RoomListing | null) {
    passwordError = '';
    askingId = room?.id ?? null;
  }

  async function join(room: RoomListing, password: string | null) {
    joiningId = room.id;
    try {
      await core.joinRoom(room.id, password);
      askingId = null;
    } catch (e) {
      if (e instanceof CoreError && e.code === 'wrong_password') {
        passwordError = e.message;
      } else {
        askingId = null;
        app.toast('error', errorText(e));
      }
    } finally {
      joiningId = null;
    }
  }
</script>

<div class="page">
  {#if inRoom && app.session}
    <button class="current" type="button" onclick={() => (app.view = 'room')}>
      <span>You're in <strong>{app.session.title}</strong></span>
      <span class="current-go">Back to room <Icon name="back" size={14} class="flip" /></span>
    </button>
  {/if}

  <div class="bar">
    <div class="search">
      <Icon name="search" size={18} />
      <input bind:value={query} placeholder="Search rooms" aria-label="Search rooms" />
      {#if query}
        <button class="icon-btn" type="button" aria-label="Clear search" onclick={() => (query = '')}>
          <Icon name="x" size={14} />
        </button>
      {/if}
      <button
        class={['icon-btn', 'filter-btn', { active: activeFilters > 0 }]}
        type="button"
        popovertarget="room-filters"
        aria-label="Filters"
        title="Filters"
      >
        <Icon name="sliders" size={18} />
        {#if activeFilters}<span class="filter-count">{activeFilters}</span>{/if}
      </button>
    </div>
    <CreateRoomMenu disabled={app.directory !== 'online' || inRoom} />
  </div>

  <div id="room-filters" class="menu filters" popover="auto">
    <p class="menu-title">Show</p>
    <div class="options" role="radiogroup" aria-label="Show">
      {#each [['all', 'All'], ['public', 'Public'], ['friends', 'Friends']] as const as [value, text] (value)}
        <label class={['option', { selected: visibility === value }]}>
          <input type="radio" name="show" {value} bind:group={visibility} class="sr-only" />{text}
        </label>
      {/each}
    </div>

    <div class="menu-sep"></div>
    <label class="menu-row">
      <span>Has space</span>
      <input type="checkbox" class="switch" bind:checked={openOnly} />
    </label>
    <label class="menu-row">
      <span>No password</span>
      <input type="checkbox" class="switch" bind:checked={noPassword} />
    </label>

    <div class="menu-sep"></div>
    <p class="menu-title">Sort</p>
    <div class="options" role="radiogroup" aria-label="Sort">
      {#each [['newest', 'Newest'], ['most', 'Most people'], ['fewest', 'Fewest']] as const as [value, text] (value)}
        <label class={['option', { selected: sort === value }]}>
          <input type="radio" name="sort" {value} bind:group={sort} class="sr-only" />{text}
        </label>
      {/each}
    </div>

    {#if activeFilters}
      <div class="menu-sep"></div>
      <button class="link" type="button" onclick={clearFilters}>Reset</button>
    {/if}
  </div>

  {#if app.directory === 'offline'}
    <div class="notice" role="alert">
      <span>Can't reach the room directory.</span>
      <button class="link" type="button" onclick={() => core.reconnectDirectory()}>Try again</button>
    </div>
  {:else if app.directory === 'connecting'}
    <p class="quiet"><Icon name="loader" size={14} class="spin" />Connecting…</p>
  {:else if rooms.length}
    <p class="count">{rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}</p>
    <ul class="rooms">
      {#each rooms as room (room.id)}
        <RoomRow
          {room}
          isYours={room.owner.id === app.me?.id}
          joining={joiningId === room.id}
          disabled={inRoom || joiningId !== null}
          asking={askingId === room.id}
          passwordError={askingId === room.id ? passwordError : ''}
          onjoin={join}
          onask={ask}
          onopen={() => (app.view = 'room')}
        />
      {/each}
    </ul>
  {:else if query || activeFilters}
    <p class="quiet">No matches. <button class="link" type="button" onclick={clearFilters}>Clear</button></p>
  {:else}
    <p class="quiet">No rooms right now.</p>
  {/if}
</div>

<style>
  .current {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-bottom: var(--space-6);
    padding: var(--space-3) 0;
    border: 0;
    border-bottom: 1px solid var(--line);
    background: none;
    color: var(--text-muted);
    cursor: pointer;
    text-align: left;
  }
  .current strong {
    color: var(--text);
    font-weight: 500;
  }
  .current-go {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
  }
  .current:hover .current-go {
    color: var(--text);
  }
  :global(.flip) {
    rotate: 180deg;
  }

  .bar {
    display: flex;
    gap: var(--space-3);
  }

  .search {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    height: 48px;
    padding: 0 var(--space-2) 0 var(--space-4);
    border: 1px solid transparent;
    border-radius: var(--radius);
    background: var(--bg-input);
    color: var(--text-faint);
    transition: border-color var(--fast) ease;
  }
  .search:focus-within {
    border-color: var(--line-strong);
  }
  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: none;
    font-size: var(--text-lg);
  }
  .search input:focus {
    outline: none;
  }
  .search input::placeholder {
    color: var(--text-faint);
  }

  .filter-btn {
    anchor-name: --room-filters;
    position: relative;
    width: 36px;
    height: 36px;
  }
  .filter-btn.active {
    color: var(--text);
  }
  .filter-count {
    position: absolute;
    top: 3px;
    right: 2px;
    font-size: 10px;
    font-weight: 600;
    color: var(--text);
  }

  .filters {
    position-anchor: --room-filters;
    inset: auto;
    top: anchor(bottom);
    right: anchor(right);
    width: 260px;
    margin-top: var(--space-3);
  }

  .count {
    margin: var(--space-8) 0 var(--space-2);
    font-size: var(--text-sm);
    color: var(--text-faint);
  }

  .rooms {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--line);
  }

  .quiet {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-10) 0;
    color: var(--text-muted);
  }

  .notice {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
    margin-top: var(--space-8);
    padding: var(--space-3) var(--space-4);
    border-left: 2px solid var(--bad);
    background: rgb(240 122 124 / 0.06);
  }
  .notice .link {
    white-space: nowrap;
  }
</style>
