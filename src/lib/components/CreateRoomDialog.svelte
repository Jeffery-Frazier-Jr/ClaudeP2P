<script lang="ts">
  import { core, PASSWORD_MAX, ROOM_TITLE_MAX, type PeerId, type PeerLimit, type Visibility } from '../core';
  import { errorText } from '../state/app.svelte';
  import BlocklistEditor from './BlocklistEditor.svelte';
  import Dialog from './Dialog.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open, onclose }: Props = $props();

  let title = $state('');
  let usePassword = $state(false);
  let password = $state('');
  let revealPassword = $state(false);
  let visibility = $state<Visibility>('public');
  let limit = $state<PeerLimit>(4);
  let blocklist = $state<PeerId[]>([]);
  let showBlocklist = $state(false);
  let busy = $state(false);
  let error = $state('');

  $effect(() => {
    if (open) {
      title = '';
      usePassword = false;
      password = '';
      revealPassword = false;
      visibility = 'public';
      limit = 4;
      blocklist = [];
      showBlocklist = false;
      error = '';
    }
  });

  const canSubmit = $derived(title.trim().length > 0 && (!usePassword || password.length > 0) && !busy);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    busy = true;
    error = '';
    try {
      await core.createRoom({
        title,
        password: usePassword ? password : null,
        visibility,
        limit,
        blocklist,
      });
      onclose();
    } catch (e) {
      error = errorText(e);
    } finally {
      busy = false;
    }
  }

  const VISIBILITY: { value: Visibility; label: string; hint: string }[] = [
    { value: 'public', label: 'Public', hint: 'Listed in the lobby for everyone' },
    { value: 'friends', label: 'Friends', hint: 'Sent only to your friends, never listed' },
  ];
  const LIMITS: PeerLimit[] = [2, 3, 4];
</script>

<Dialog {open} title="Create a room" subtitle="People join while it waits. You press Start when you're ready." {onclose}>
  <form id="create-room" class="form" onsubmit={submit}>
    <label class="field">
      <span class="field-label">Room name</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="input"
        bind:value={title}
        maxlength={ROOM_TITLE_MAX}
        placeholder="Late night chill"
        autocomplete="off"
        autofocus
      />
      <span class="field-hint counter">{title.length}/{ROOM_TITLE_MAX}</span>
    </label>

    <fieldset class="field">
      <legend class="field-label">Who can see it</legend>
      <div class="choice-row">
        {#each VISIBILITY as option (option.value)}
          <label class={['choice', { selected: visibility === option.value }]}>
            <input type="radio" name="visibility" value={option.value} bind:group={visibility} class="sr-only" />
            <Icon name={option.value === 'public' ? 'globe' : 'heart'} size={18} />
            <span class="choice-text">
              <span class="choice-label">{option.label}</span>
              <span class="choice-hint">{option.hint}</span>
            </span>
          </label>
        {/each}
      </div>
    </fieldset>

    <fieldset class="field">
      <legend class="field-label">People (including you)</legend>
      <div class="segmented" role="radiogroup">
        {#each LIMITS as n (n)}
          <label class={['segment', { selected: limit === n }]}>
            <input type="radio" name="limit" value={n} bind:group={limit} class="sr-only" />
            {n}
          </label>
        {/each}
      </div>
      <span class="field-hint">{limit === 2 ? 'Like a direct message: history is kept separately by each person.' : 'A group room. Members can choose to sync history when they join.'}</span>
    </fieldset>

    <div class="field">
      <label class="switch-row">
        <span class="switch-text">
          <span class="switch-title"><Icon name="lock" size={14} /> Password</span>
          <span class="field-hint">Checked by your app directly. The directory never sees it.</span>
        </span>
        <input type="checkbox" class="switch" bind:checked={usePassword} />
      </label>
      {#if usePassword}
        <div class="input-wrap">
          <input
            class="input"
            type={revealPassword ? 'text' : 'password'}
            bind:value={password}
            maxlength={PASSWORD_MAX}
            placeholder="Room password"
            autocomplete="new-password"
            aria-label="Room password"
          />
          <button
            class="icon-btn reveal"
            type="button"
            aria-label={revealPassword ? 'Hide password' : 'Show password'}
            onclick={() => (revealPassword = !revealPassword)}
          >
            <Icon name={revealPassword ? 'eye-off' : 'eye'} size={16} />
          </button>
        </div>
      {/if}
    </div>

    <div class="field">
      <button class="disclosure" type="button" aria-expanded={showBlocklist} onclick={() => (showBlocklist = !showBlocklist)}>
        <Icon name="ban" size={14} />
        <span>Blocklist</span>
        {#if blocklist.length}<span class="badge badge-danger">{blocklist.length}</span>{/if}
        <span class="field-hint">Kept only on your PC</span>
      </button>
      {#if showBlocklist}
        <BlocklistEditor bind:blocked={blocklist} />
      {/if}
    </div>

    {#if error}<p class="field-error" role="alert">{error}</p>{/if}
  </form>

  {#snippet footer()}
    <button class="btn btn-ghost" type="button" onclick={onclose}>Cancel</button>
    <button class="btn btn-primary" type="submit" form="create-room" disabled={!canSubmit}>
      {#if busy}<Icon name="loader" size={16} class="spin" />{/if}
      Create room
    </button>
  {/snippet}
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }
  legend {
    padding: 0;
    margin-bottom: var(--space-2);
  }

  .counter {
    align-self: flex-end;
    margin-top: calc(var(--space-1) * -1);
  }

  .choice-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }
  .choice {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-sidebar);
    color: var(--text-muted);
    cursor: pointer;
    transition:
      border-color var(--fast) ease,
      background-color var(--fast) ease;
  }
  .choice:hover {
    border-color: var(--border-strong);
  }
  .choice.selected {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--text);
  }
  .choice:has(:focus-visible) {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }
  .choice-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .choice-label {
    font-weight: 600;
    color: var(--text);
  }
  .choice-hint {
    font-size: var(--text-xs);
  }

  .segmented {
    display: inline-flex;
    padding: 3px;
    border-radius: var(--radius-md);
    background: var(--bg-sunken);
    align-self: flex-start;
  }
  .segment {
    display: grid;
    place-items: center;
    width: 56px;
    height: 30px;
    border-radius: 6px;
    color: var(--text-muted);
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color var(--fast) ease,
      color var(--fast) ease;
  }
  .segment:hover {
    color: var(--text);
  }
  .segment.selected {
    background: var(--bg-active);
    color: var(--text);
    box-shadow: var(--shadow-card);
  }
  .segment:has(:focus-visible) {
    outline: 2px solid var(--focus-ring);
  }

  .switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    cursor: pointer;
  }
  .switch-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .switch-title {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-weight: 600;
  }

  /* A checkbox drawn as a toggle switch */
  .switch {
    appearance: none;
    position: relative;
    width: 40px;
    height: 24px;
    margin: 0;
    border-radius: var(--radius-pill);
    background: var(--border-strong);
    cursor: pointer;
    flex-shrink: 0;
    transition: background-color var(--normal) ease;
  }
  .switch::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    transition: translate var(--normal) var(--ease);
  }
  .switch:checked {
    background: var(--success);
  }
  .switch:checked::after {
    translate: 16px 0;
  }

  .input-wrap {
    position: relative;
  }
  .input-wrap .input {
    padding-right: 44px;
  }
  .reveal {
    position: absolute;
    top: 4px;
    right: 4px;
  }

  .disclosure {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0;
    border: 0;
    background: none;
    font-weight: 600;
    cursor: pointer;
  }
  .disclosure .field-hint {
    margin-left: auto;
    font-weight: 400;
  }
</style>
