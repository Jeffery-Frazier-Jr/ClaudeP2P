<script lang="ts">
  import { core, PASSWORD_MAX, ROOM_TITLE_MAX, type PeerId, type PeerLimit, type Visibility } from '../core';
  import { app, errorText } from '../state/app.svelte';
  import BlocklistEditor from './BlocklistEditor.svelte';
  import Icon from './Icon.svelte';

  let title = $state('');
  let visibility = $state<Visibility>('public');
  let limit = $state<PeerLimit>(4);
  let usePassword = $state(false);
  let password = $state('');
  let reveal = $state(false);
  let blocklist = $state<PeerId[]>([]);
  let editingBlocklist = $state(false);
  let busy = $state(false);
  let error = $state('');

  const online = $derived(app.directory === 'online');
  const canSubmit = $derived(online && title.trim().length > 0 && (!usePassword || password.length > 0) && !busy);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    busy = true;
    error = '';
    try {
      await core.createRoom({ title, password: usePassword ? password : null, visibility, limit, blocklist });
      title = '';
      password = '';
      usePassword = false;
      editingBlocklist = false;
    } catch (e) {
      error = errorText(e);
    } finally {
      busy = false;
    }
  }
</script>

<form class="form" onsubmit={submit} aria-labelledby="create-heading">
  <h2 id="create-heading" class="eyebrow">Create a room</h2>

  <div class="field">
    <label class="label" for="room-name">Name</label>
    <input
      id="room-name"
      class="input"
      bind:value={title}
      maxlength={ROOM_TITLE_MAX}
      placeholder="Late night chill"
      autocomplete="off"
    />
  </div>

  <fieldset class="field">
    <legend class="label">Visible to</legend>
    <div class="options">
      {#each [['public', 'Everyone'], ['friends', 'Friends']] as const as [value, text] (value)}
        <label class={['option', { selected: visibility === value }]}>
          <input type="radio" name="visibility" {value} bind:group={visibility} class="sr-only" />{text}
        </label>
      {/each}
    </div>
    <p class="hint">
      {visibility === 'public' ? 'Listed here for anyone to find.' : 'Never listed. Sent only to your friends.'}
    </p>
  </fieldset>

  <fieldset class="field">
    <legend class="label">People, including you</legend>
    <div class="options">
      {#each [2, 3, 4] as const as n (n)}
        <label class={['option', 'number', { selected: limit === n }]}>
          <input type="radio" name="limit" value={n} bind:group={limit} class="sr-only" />{n}
        </label>
      {/each}
    </div>
    <p class="hint">
      {limit === 2 ? 'Like a direct message. Each of you keeps your own history.' : 'A group. People can ask for history when they join.'}
    </p>
  </fieldset>

  <div class="field">
    <label class="line">
      <span class="label">Password</span>
      <input type="checkbox" class="switch" bind:checked={usePassword} />
    </label>
    {#if usePassword}
      <div class="secret">
        <input
          class="input"
          type={reveal ? 'text' : 'password'}
          bind:value={password}
          maxlength={PASSWORD_MAX}
          autocomplete="new-password"
          aria-label="Room password"
          placeholder="Room password"
        />
        <button class="icon-btn" type="button" aria-label={reveal ? 'Hide password' : 'Show password'} onclick={() => (reveal = !reveal)}>
          <Icon name={reveal ? 'eye-off' : 'eye'} size={16} />
        </button>
      </div>
      <p class="hint">Checked by your app directly. The directory never sees it.</p>
    {/if}
  </div>

  <div class="field">
    <div class="line">
      <span class="label">Blocklist</span>
      <span class="line-end">
        <span class="count">{blocklist.length ? `${blocklist.length} blocked` : 'None'}</span>
        <button class="link" type="button" aria-expanded={editingBlocklist} onclick={() => (editingBlocklist = !editingBlocklist)}>
          {editingBlocklist ? 'Done' : 'Edit'}
        </button>
      </span>
    </div>
    {#if editingBlocklist}
      <BlocklistEditor bind:blocked={blocklist} exclude={app.me ? [app.me.id] : []} />
      <p class="hint">Kept only on your PC. Matched by identity, so a new nickname won't get around it.</p>
    {/if}
  </div>

  <button class="btn btn-primary submit" type="submit" disabled={!canSubmit}>
    {#if busy}<Icon name="loader" size={16} class="spin" />{/if}
    Create room
  </button>
  {#if !online}<p class="hint">Rooms can be created once the directory is reachable.</p>{/if}
  {#if error}<p class="error-text" role="alert">{error}</p>{/if}
</form>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }
  legend {
    padding: 0;
    margin-bottom: var(--space-2);
  }

  .number {
    min-width: 14px;
    text-align: center;
  }

  .line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }
  label.line {
    cursor: pointer;
  }
  .line-end {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--text-sm);
  }
  .count {
    color: var(--text-faint);
  }

  .secret {
    display: flex;
    align-items: flex-end;
    gap: var(--space-1);
  }

  .submit {
    margin-top: var(--space-2);
  }
</style>
