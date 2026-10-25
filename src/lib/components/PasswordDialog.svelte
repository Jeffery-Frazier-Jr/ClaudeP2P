<script lang="ts">
  import { PASSWORD_MAX, type RoomListing } from '../core';
  import Dialog from './Dialog.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    room: RoomListing | null;
    busy: boolean;
    error: string;
    onsubmit: (password: string) => void;
    onclose: () => void;
  }

  let { room, busy, error, onsubmit, onclose }: Props = $props();

  let password = $state('');
  let reveal = $state(false);

  $effect(() => {
    if (room) {
      password = '';
      reveal = false;
    }
  });

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (password && !busy) onsubmit(password);
  }
</script>

<Dialog open={room !== null} title="Enter password" subtitle={room?.title} width="sm" {onclose}>
  <form id="password-form" class="form" onsubmit={submit}>
    <label class="field">
      <span class="field-label">Room password</span>
      <div class="input-wrap">
        <!-- svelte-ignore a11y_autofocus -->
        <input
          class="input"
          type={reveal ? 'text' : 'password'}
          bind:value={password}
          maxlength={PASSWORD_MAX}
          autocomplete="off"
          aria-invalid={error ? 'true' : undefined}
          autofocus
        />
        <button
          class="icon-btn reveal"
          type="button"
          aria-label={reveal ? 'Hide password' : 'Show password'}
          onclick={() => (reveal = !reveal)}
        >
          <Icon name={reveal ? 'eye-off' : 'eye'} size={16} />
        </button>
      </div>
      {#if error}<span class="field-error" role="alert">{error}</span>{/if}
    </label>
    <p class="note">
      <Icon name="shield" size={14} />
      The password is checked by the owner's app directly. It never goes to the directory.
    </p>
  </form>

  {#snippet footer()}
    <button class="btn btn-ghost" type="button" onclick={onclose}>Cancel</button>
    <button class="btn btn-primary" type="submit" form="password-form" disabled={!password || busy}>
      {#if busy}<Icon name="loader" size={16} class="spin" />{/if}
      Join room
    </button>
  {/snippet}
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
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
  .note {
    display: flex;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--text-faint);
  }
</style>
