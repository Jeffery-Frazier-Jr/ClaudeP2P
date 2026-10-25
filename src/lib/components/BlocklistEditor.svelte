<script lang="ts">
  import { core, type PeerId, type Profile } from '../core';
  import Avatar from './Avatar.svelte';

  // Picks identities to refuse. Works on keys, not nicknames, so changing a
  // nickname can't get someone around it.

  interface Props {
    blocked: PeerId[];
    /** Hide these identities from the list, for example yourself. */
    exclude?: PeerId[];
  }

  let { blocked = $bindable(), exclude = [] }: Props = $props();

  let people = $state<Profile[]>([]);
  let query = $state('');
  let pasted = $state('');
  let pasteError = $state('');

  core.knownPeers().then((list) => (people = list));

  // Blocked people first, then everyone else, filtered by the search.
  const visible = $derived.by(() => {
    const q = query.trim().toLowerCase().replace(/^#/, '');
    return people
      .filter((p) => !exclude.includes(p.id))
      .filter((p) => !q || p.nickname.toLowerCase().includes(q) || p.tag.toLowerCase().includes(q))
      .toSorted((a, b) => Number(blocked.includes(b.id)) - Number(blocked.includes(a.id)));
  });

  // Identities pasted by ID that aren't in your known list.
  const unknownBlocked = $derived(blocked.filter((id) => !people.some((p) => p.id === id)));

  function toggle(id: PeerId) {
    blocked = blocked.includes(id) ? blocked.filter((b) => b !== id) : [...blocked, id];
  }

  function addPasted() {
    const id = pasted.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(id)) {
      pasteError = 'Paste the full 64-character ID.';
      return;
    }
    if (!blocked.includes(id)) blocked = [...blocked, id];
    pasted = '';
    pasteError = '';
  }
</script>

<div class="editor">
  <input class="input search" bind:value={query} placeholder="Search people you've met" aria-label="Search people" />

  <ul class="people">
    {#each unknownBlocked as id (id)}
      <li class="person blocked">
        <span class="name mono">{id.slice(0, 12)}…</span>
        <button class="link" type="button" onclick={() => toggle(id)}>Unblock</button>
      </li>
    {/each}
    {#each visible as person (person.id)}
      {@const isBlocked = blocked.includes(person.id)}
      <li class={['person', { blocked: isBlocked }]}>
        <Avatar profile={person} size="xs" />
        <span class="name">{person.nickname} <span class="tag">#{person.tag}</span></span>
        <button class="link" type="button" aria-pressed={isBlocked} onclick={() => toggle(person.id)}>
          {isBlocked ? 'Unblock' : 'Block'}
        </button>
      </li>
    {:else}
      <li class="none">No one matches.</li>
    {/each}
  </ul>

  <div class="paste">
    <input
      class="input mono"
      bind:value={pasted}
      placeholder="Or paste a full ID"
      aria-label="Paste an identity to block"
      aria-invalid={pasteError ? 'true' : undefined}
      spellcheck="false"
      onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addPasted())}
    />
    <button class="link" type="button" disabled={!pasted.trim()} onclick={addPasted}>Block</button>
  </div>
  {#if pasteError}<p class="error-text">{pasteError}</p>{/if}
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .search {
    height: 34px;
    font-size: var(--text-sm);
  }

  .people {
    max-height: 200px;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
  }
  .person {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: 34px;
    border-bottom: 1px solid var(--line);
    font-size: var(--text-sm);
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .name .tag {
    font-size: 11px;
  }
  .person.blocked .name {
    color: var(--bad);
  }
  .person .link {
    font-size: var(--text-xs);
  }
  .none {
    padding: var(--space-2) 0;
    font-size: var(--text-sm);
    color: var(--text-faint);
  }

  .mono {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .paste {
    display: flex;
    align-items: flex-end;
    gap: var(--space-3);
  }
  .paste .input {
    height: 34px;
  }
  .paste .link {
    font-size: var(--text-sm);
    padding-bottom: 8px;
  }
</style>
