<script lang="ts">
  import { PASSWORD_MAX, type RoomListing } from '../core';
  import { timeAgo } from '../format';
  import { clock } from '../state/clock.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    room: RoomListing;
    isYours: boolean;
    joining: boolean;
    disabled: boolean;
    /** Shown under the password field after a failed attempt. */
    passwordError: string;
    /** True while this row is asking for a password. */
    asking: boolean;
    onjoin: (room: RoomListing, password: string | null) => void;
    onask: (room: RoomListing | null) => void;
    onopen: () => void;
  }

  let { room, isYours, joining, disabled, passwordError, asking, onjoin, onask, onopen }: Props = $props();

  let password = $state('');
  let field: HTMLInputElement | undefined = $state();

  const full = $derived(room.memberCount >= room.limit);

  function join() {
    if (room.hasPassword) {
      password = '';
      onask(room);
      queueMicrotask(() => field?.focus());
    } else {
      onjoin(room, null);
    }
  }

  function submitPassword(event: SubmitEvent) {
    event.preventDefault();
    if (password) onjoin(room, password);
  }
</script>

<li class={['row', { full, asking }]}>
  <div class="main">
    <div class="title-line">
      <span class="title">{room.title}</span>
      {#if room.hasPassword}
        <span class="mark" title="Needs a password"><Icon name="lock" size={13} label="Password" /></span>
      {/if}
    </div>
    <div class="meta">
      <span>{room.owner.nickname} <span class="tag">#{room.owner.tag}</span></span>
      {#if room.visibility === 'friends'}<span>Friends only</span>{/if}
      {#if isYours}<span class="yours">Your room</span>{/if}
      <span>{timeAgo(room.createdAt, clock.now)}</span>
    </div>
  </div>

  <div class="capacity" title="{room.memberCount} of {room.limit} spots taken">
    <span class="bar" aria-hidden="true">
      {#each Array(room.limit) as _, i (i)}<span class={['seg', { taken: i < room.memberCount }]}></span>{/each}
    </span>
    <span class="count">{full ? 'Full' : `${room.memberCount} of ${room.limit}`}</span>
  </div>

  <div class="action">
    {#if isYours}
      <button class="btn btn-sm" type="button" onclick={onopen}>Open</button>
    {:else if !full && !asking}
      <button class="btn btn-sm" type="button" disabled={disabled || joining} onclick={join}>
        {#if joining}<Icon name="loader" size={14} class="spin" />{/if}Join
      </button>
    {/if}
  </div>

  {#if asking}
    <form class="password" onsubmit={submitPassword}>
      <input
        bind:this={field}
        class="input"
        type="password"
        bind:value={password}
        maxlength={PASSWORD_MAX}
        placeholder="Room password"
        aria-label="Password for {room.title}"
        aria-invalid={passwordError ? 'true' : undefined}
        autocomplete="off"
      />
      <button class="btn btn-sm btn-primary" type="submit" disabled={!password || joining}>
        {#if joining}<Icon name="loader" size={14} class="spin" />{/if}Join
      </button>
      <button class="link" type="button" onclick={() => onask(null)}>Cancel</button>
      {#if passwordError}<p class="error-text" role="alert">{passwordError}</p>{/if}
    </form>
  {/if}
</li>

<style>
  .row {
    display: grid;
    grid-template-columns: 1fr auto 88px;
    align-items: center;
    column-gap: var(--space-8);
    position: relative;
    padding: var(--space-4) var(--space-3);
    margin: 0 calc(var(--space-3) * -1);
    transition: background-color var(--fast) ease;
  }
  /* The divider stays the width of the content; only the hover bleeds out */
  .row::after {
    content: '';
    position: absolute;
    left: var(--space-3);
    right: var(--space-3);
    bottom: 0;
    height: 1px;
    background: var(--line);
  }
  .row:hover,
  .row.asking {
    background: var(--bg-hover);
  }
  .row.full .title,
  .row.full .meta {
    opacity: 0.55;
  }

  .main {
    min-width: 0;
  }
  .title-line {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: 2px;
  }
  .title {
    font-size: var(--text-lg);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mark {
    color: var(--text-faint);
  }
  .meta .tag {
    font-size: 11px;
  }
  .yours {
    color: var(--text);
  }

  .capacity {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }
  .bar {
    display: flex;
    gap: 3px;
  }
  .seg {
    width: 14px;
    height: 3px;
    background: var(--line-strong);
  }
  .seg.taken {
    background: var(--text-muted);
  }
  .count {
    font-size: var(--text-xs);
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  .action {
    display: flex;
    justify-content: flex-end;
  }

  .password {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-4);
    margin-top: var(--space-3);
  }
  .password .input {
    max-width: 280px;
    height: 32px;
  }
  .password .error-text {
    flex-basis: 100%;
  }
</style>
