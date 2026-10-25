<script lang="ts">
  import { core, PASSWORD_MAX, ROOM_TITLE_MAX, type PeerLimit } from '../core';
  import { app, errorText } from '../state/app.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    disabled: boolean;
  }

  let { disabled }: Props = $props();

  let menu: HTMLDivElement | undefined = $state();
  let title = $state('');
  let limit = $state<PeerLimit>(4);
  let friendsOnly = $state(false);
  let usePassword = $state(false);
  let password = $state('');
  let busy = $state(false);
  let error = $state('');

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
        visibility: friendsOnly ? 'friends' : 'public',
        limit,
        blocklist: [],
      });
      menu?.hidePopover();
      title = '';
      password = '';
      usePassword = false;
    } catch (e) {
      error = errorText(e);
    } finally {
      busy = false;
    }
  }
</script>

<button class="btn btn-primary trigger" type="button" popovertarget="create-room" {disabled}>
  <Icon name="plus" size={16} />Create room
</button>

<div bind:this={menu} id="create-room" class="menu" popover="auto">
  <form class="form" onsubmit={submit}>
    <!-- svelte-ignore a11y_autofocus -->
    <input
      class="input name"
      bind:value={title}
      maxlength={ROOM_TITLE_MAX}
      placeholder="Room name"
      aria-label="Room name"
      autocomplete="off"
      autofocus
    />

    <div class="menu-row static">
      <span>People</span>
      <span class="options" role="radiogroup" aria-label="People">
        {#each [2, 3, 4] as const as n (n)}
          <label class={['option', { selected: limit === n }]}>
            <input type="radio" name="limit" value={n} bind:group={limit} class="sr-only" />{n}
          </label>
        {/each}
      </span>
    </div>

    <label class="menu-row">
      <span>Friends only</span>
      <input type="checkbox" class="switch" bind:checked={friendsOnly} />
    </label>

    <label class="menu-row">
      <span>Password</span>
      <input type="checkbox" class="switch" bind:checked={usePassword} />
    </label>
    {#if usePassword}
      <input
        class="input"
        type="password"
        bind:value={password}
        maxlength={PASSWORD_MAX}
        placeholder="Password"
        aria-label="Room password"
        autocomplete="new-password"
      />
    {/if}

    {#if error}<p class="error-text" role="alert">{error}</p>{/if}

    <button class="btn btn-primary submit" type="submit" disabled={!canSubmit}>
      {#if busy}<Icon name="loader" size={16} class="spin" />{/if}Create
    </button>
  </form>
</div>

<style>
  .trigger {
    anchor-name: --create-room;
    height: 48px;
    flex-shrink: 0;
  }

  .menu {
    position-anchor: --create-room;
    inset: auto;
    top: anchor(bottom);
    right: anchor(right);
    width: 300px;
    margin-top: var(--space-2);
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .name {
    margin-bottom: var(--space-2);
    font-size: var(--text-lg);
  }
  .static {
    cursor: default;
  }
  .options {
    gap: var(--space-4);
  }
  .submit {
    margin-top: var(--space-3);
  }
</style>
