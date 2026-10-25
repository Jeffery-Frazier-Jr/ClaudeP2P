<script lang="ts">
  import type { RoomListing } from '../core';
  import { timeAgo } from '../format';
  import { clock } from '../state/clock.svelte';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    room: RoomListing;
    isYours: boolean;
    joining: boolean;
    disabled: boolean;
    onjoin: (room: RoomListing) => void;
    onopen: () => void;
  }

  let { room, isYours, joining, disabled, onjoin, onopen }: Props = $props();

  const full = $derived(room.memberCount >= room.limit);
  const slots = $derived(Array.from({ length: room.limit }, (_, i) => i < room.memberCount));
</script>

<article class={['card', { full, yours: isYours }]} aria-label={room.title}>
  <div class="top">
    <h3 class="title" title={room.title}>{room.title}</h3>
    <div class="badges">
      {#if isYours}<span class="badge badge-accent">Yours</span>{/if}
      {#if room.visibility === 'friends'}
        <span class="badge" title="Only friends can see this room"><Icon name="heart" size={11} />Friends</span>
      {/if}
      {#if room.hasPassword}
        <span class="badge" title="Needs a password"><Icon name="lock" size={11} /><span class="sr-only">Password</span></span>
      {/if}
    </div>
  </div>

  <div class="owner">
    <Avatar profile={room.owner} size="xs" />
    <span class="owner-name">{room.owner.nickname}</span>
    <span class="tag">#{room.owner.tag}</span>
  </div>

  <div class="bottom">
    <div class="slots" title="{room.memberCount} of {room.limit} spots taken">
      {#each slots as taken, i (i)}
        <span class={['slot', { taken }]}></span>
      {/each}
      <span class="slot-text">{room.memberCount}/{room.limit}</span>
    </div>
    <span class="age"><Icon name="clock" size={12} />{timeAgo(room.createdAt, clock.now)}</span>

    {#if isYours}
      <button class="btn btn-secondary btn-sm" type="button" onclick={onopen}>Open</button>
    {:else if full}
      <button class="btn btn-secondary btn-sm" type="button" disabled>Full</button>
    {:else}
      <button class="btn btn-primary btn-sm" type="button" disabled={disabled || joining} onclick={() => onjoin(room)}>
        {#if joining}
          <Icon name="loader" size={14} class="spin" />Joining
        {:else}
          Join
        {/if}
      </button>
    {/if}
  </div>
</article>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 1px solid transparent;
    border-radius: var(--radius-lg);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
    transition:
      background-color var(--fast) ease,
      border-color var(--fast) ease,
      transform var(--normal) var(--ease);
  }
  .card:hover {
    background: var(--bg-raised-hover);
    transform: translateY(-1px);
  }
  .card.yours {
    border-color: var(--accent-soft);
  }
  .card.full {
    opacity: 0.7;
  }

  .top {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
  }
  .title {
    flex: 1;
    min-width: 0;
    font-size: var(--text-lg);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .badges {
    display: flex;
    gap: var(--space-1);
    flex-shrink: 0;
  }

  .owner {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    font-size: var(--text-sm);
    color: var(--text-muted);
  }
  .owner-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .owner .tag {
    font-size: 11px;
  }

  .bottom {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-top: auto;
  }

  .slots {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .slot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--border-strong);
  }
  .slot.taken {
    border-color: var(--success);
    background: var(--success);
  }
  .full .slot.taken {
    border-color: var(--text-faint);
    background: var(--text-faint);
  }
  .slot-text {
    margin-left: 2px;
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-muted);
  }

  .age {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    font-size: var(--text-xs);
    color: var(--text-faint);
  }
</style>
