<script lang="ts">
  import { core, type PeerId, type Profile } from '../core';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';

  // Picks identities to refuse. Works on keys, not nicknames, so changing a
  // nickname can't get someone around it.

  interface Props {
    blocked: PeerId[];
    /** Hide people currently in the room, for example yourself. */
    exclude?: PeerId[];
  }

  let { blocked = $bindable(), exclude = [] }: Props = $props();

  let people = $state<Profile[]>([]);
  let query = $state('');
  let pasted = $state('');
  let pasteError = $state('');

  core.knownPeers().then((list) => (people = list));

  const visible = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((p) => !exclude.includes(p.id))
      .filter((p) => !q || p.nickname.toLowerCase().includes(q) || p.tag.toLowerCase().includes(q.replace('#', '')));
  });

  function toggle(id: PeerId) {
    blocked = blocked.includes(id) ? blocked.filter((b) => b !== id) : [...blocked, id];
  }

  function addPasted() {
    const id = pasted.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(id)) {
      pasteError = 'That is not a valid identity. Paste the full 64-character ID.';
      return;
    }
    if (!blocked.includes(id)) blocked = [...blocked, id];
    pasted = '';
    pasteError = '';
  }

  function nameFor(id: PeerId): string {
    return people.find((p) => p.id === id)?.nickname ?? `${id.slice(0, 8)}…`;
  }
</script>

<div class="editor">
  {#if blocked.length}
    <ul class="chips" aria-label="Blocked">
      {#each blocked as id (id)}
        <li class="chip">
          <Icon name="ban" size={12} />
          <span>{nameFor(id)}</span>
          <button type="button" aria-label="Unblock {nameFor(id)}" onclick={() => toggle(id)}>
            <Icon name="x" size={12} />
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="search">
    <Icon name="search" size={14} />
    <input class="search-input" bind:value={query} placeholder="Search people you've met" aria-label="Search people" />
  </div>

  <ul class="people">
    {#each visible as person (person.id)}
      {@const isBlocked = blocked.includes(person.id)}
      <li>
        <button class={['person', { blocked: isBlocked }]} type="button" aria-pressed={isBlocked} onclick={() => toggle(person.id)}>
          <Avatar profile={person} size="sm" />
          <span class="name">{person.nickname}</span>
          <span class="tag">#{person.tag}</span>
          <span class="state">{isBlocked ? 'Blocked' : 'Block'}</span>
        </button>
      </li>
    {:else}
      <li class="empty">No one matches.</li>
    {/each}
  </ul>

  <div class="paste">
    <input
      class="input"
      bind:value={pasted}
      placeholder="Or paste someone's full ID"
      aria-label="Paste an identity to block"
      spellcheck="false"
      onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addPasted())}
    />
    <button class="btn btn-secondary" type="button" disabled={!pasted.trim()} onclick={addPasted}>Add</button>
  </div>
  {#if pasteError}<span class="field-error">{pasteError}</span>{/if}
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding: 0 4px 0 8px;
    border-radius: var(--radius-pill);
    background: var(--danger-soft);
    color: #f58b8d;
    font-size: var(--text-xs);
    font-weight: 600;
  }
  .chip button {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  .chip button:hover {
    background: rgb(255 255 255 / 0.1);
  }

  .search {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: 34px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-md);
    background: var(--bg-sunken);
    color: var(--text-faint);
  }
  .search-input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: none;
    font-size: var(--text-sm);
  }
  .search-input:focus {
    outline: none;
  }

  .people {
    max-height: 168px;
    margin: 0;
    padding: var(--space-1);
    list-style: none;
    overflow-y: auto;
    border-radius: var(--radius-md);
    background: var(--bg-sidebar);
  }
  .person {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    height: 36px;
    padding: 0 var(--space-2);
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    cursor: pointer;
    text-align: left;
  }
  .person:hover {
    background: var(--bg-raised-hover);
  }
  .name {
    font-size: var(--text-sm);
    font-weight: 500;
  }
  .person .tag {
    flex: 1;
    font-size: 11px;
  }
  .state {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-faint);
  }
  .person:hover .state {
    color: var(--danger);
  }
  .person.blocked .state {
    color: var(--danger);
  }
  .person.blocked .name {
    color: var(--text-muted);
    text-decoration: line-through;
  }
  .empty {
    padding: var(--space-2);
    font-size: var(--text-sm);
    color: var(--text-faint);
  }

  .paste {
    display: flex;
    gap: var(--space-2);
  }
  .paste .input {
    height: 36px;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }
</style>
