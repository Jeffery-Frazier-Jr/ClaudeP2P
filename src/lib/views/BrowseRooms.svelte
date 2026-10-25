<script lang="ts">
  import { core, CoreError, type RoomListing } from '../core';
  import { plural } from '../format';
  import { app, errorText } from '../state/app.svelte';
  import CreateRoomForm from '../components/CreateRoomForm.svelte';
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

  const filtersActive = $derived(query.trim() !== '' || visibility !== 'all' || openOnly || noPassword);
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
  <aside class="page-aside">
    {#if inRoom && app.session}
      <div class="current">
        <h2 class="eyebrow">Your room</h2>
        <p class="current-title">{app.session.title}</p>
        <p class="hint">
          {app.session.phase === 'waiting' ? 'Waiting to start.' : 'Running peer-to-peer.'} You can be in one room at a time.
        </p>
        <button class="btn btn-primary" type="button" onclick={() => (app.view = 'room')}>Back to room</button>
      </div>
    {:else}
      <CreateRoomForm />
    {/if}
  </aside>

  <section class="list-col" aria-labelledby="rooms-heading">
    <div class="heading">
      <h1 id="rooms-heading">Rooms</h1>
      {#if app.directory === 'online'}
        <span class="count">{plural(app.listings.length, 'room', 'rooms')} waiting to start</span>
      {/if}
    </div>

    {#if app.directory === 'offline'}
      <div class="notice" role="alert">
        <p><strong>Can't reach the room directory.</strong> It's only used to find and start rooms, so rooms that already started keep working.</p>
        <button class="link" type="button" onclick={() => core.reconnectDirectory()}>Try again</button>
      </div>
    {:else if app.directory === 'connecting'}
      <p class="quiet"><Icon name="loader" size={14} class="spin" /> Connecting to the directory…</p>
    {:else}
      <div class="search">
        <Icon name="search" size={16} />
        <input class="input" bind:value={query} placeholder="Search rooms, nicknames or #tags" aria-label="Search rooms" />
        {#if query}
          <button class="icon-btn" type="button" aria-label="Clear search" onclick={() => (query = '')}>
            <Icon name="x" size={14} />
          </button>
        {/if}
      </div>

      <div class="filters">
        <div class="options" role="radiogroup" aria-label="Show">
          {#each [['all', 'All'], ['public', 'Public'], ['friends', 'Friends']] as const as [value, text] (value)}
            <label class={['option', { selected: visibility === value }]}>
              <input type="radio" name="show" {value} bind:group={visibility} class="sr-only" />{text}
            </label>
          {/each}
        </div>
        <span class="sep" aria-hidden="true"></span>
        <div class="options">
          <label class={['option', { selected: openOnly }]}>
            <input type="checkbox" bind:checked={openOnly} class="sr-only" />Has space
          </label>
          <label class={['option', { selected: noPassword }]}>
            <input type="checkbox" bind:checked={noPassword} class="sr-only" />No password
          </label>
        </div>
        <label class="sort">
          <span class="sr-only">Sort</span>
          <select bind:value={sort}>
            <option value="newest">Newest first</option>
            <option value="most">Most people</option>
            <option value="fewest">Fewest people</option>
          </select>
        </label>
      </div>

      {#if rooms.length}
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
      {:else if filtersActive}
        <p class="quiet">
          No rooms match. <button class="link" type="button" onclick={clearFilters}>Clear the filters</button>
        </p>
      {:else}
        <p class="quiet">No rooms are waiting right now. Create one and it will show up here until you start it.</p>
      {/if}
    {/if}
  </section>
</div>

<style>
  .heading {
    display: flex;
    align-items: baseline;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }
  h1 {
    font-size: var(--text-2xl);
    letter-spacing: -0.01em;
  }
  .count {
    color: var(--text-faint);
    font-size: var(--text-sm);
  }

  .search {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    color: var(--text-faint);
    border-bottom: 1px solid var(--line-strong);
  }
  .search:focus-within {
    border-bottom-color: var(--text);
  }
  .search .input,
  .search .input:hover,
  .search .input:focus {
    border-bottom: 0;
    height: 44px;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-5);
    padding: var(--space-4) 0 var(--space-2);
    font-size: var(--text-sm);
  }
  .sep {
    width: 1px;
    height: 14px;
    background: var(--line-strong);
  }
  .sort {
    margin-left: auto;
  }
  .sort select {
    padding: var(--space-1) 0;
    border: 0;
    background: transparent;
    color: var(--text-muted);
    font-size: var(--text-sm);
    cursor: pointer;
  }
  .sort select:hover {
    color: var(--text);
  }
  .sort option {
    background: var(--bg-input);
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
    padding: var(--space-8) 0;
    color: var(--text-muted);
  }

  .notice {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
    padding: var(--space-3) var(--space-4);
    border-left: 2px solid var(--bad);
    background: rgb(240 122 124 / 0.06);
    color: var(--text-muted);
  }
  .notice .link {
    white-space: nowrap;
  }
  .notice strong {
    color: var(--text);
    font-weight: 500;
  }

  .current {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }
  .current-title {
    font-size: var(--text-xl);
    font-weight: 600;
  }
  .current .btn {
    margin-top: var(--space-2);
  }
</style>
