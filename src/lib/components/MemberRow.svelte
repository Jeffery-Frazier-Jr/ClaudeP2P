<script lang="ts">
  import type { RoomMember, RoomPhase } from '../core';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    member: RoomMember;
    phase: RoomPhase;
    canRemove: boolean;
    onremove: (member: RoomMember, alsoBlock: boolean) => void;
  }

  let { member, phase, canRemove, onremove }: Props = $props();

  let confirming = $state(false);

  const LINK = {
    pending: '',
    connecting: 'Connecting directly…',
    connected: 'Direct',
    failed: "Couldn't connect",
  } as const;
</script>

<li class={['row', { confirming }]}>
  <Avatar profile={member.profile} size="md" />

  <div class="who">
    <span class="name">{member.profile.nickname}</span>
    <span class="meta">
      <span class="tag">#{member.profile.tag}</span>
      {#if member.isOwner}<span>Owner</span>{/if}
      {#if member.isYou}<span>You</span>{/if}
    </span>
  </div>

  <div class="end">
    {#if confirming}
      <span class="question">Remove {member.profile.nickname}?</span>
      <button class="link" type="button" onclick={() => onremove(member, false)}>Remove</button>
      <button class="link link-danger" type="button" onclick={() => onremove(member, true)}>Remove and block</button>
      <button class="link" type="button" onclick={() => (confirming = false)}>Cancel</button>
    {:else}
      {#if phase !== 'waiting' && !member.isYou}
        <span class={['link-state', member.link]}>
          {#if member.link === 'connecting'}<Icon name="loader" size={13} class="spin" />{/if}
          {LINK[member.link]}
        </span>
      {/if}
      {#if canRemove && !member.isYou}
        <button class="link remove" type="button" onclick={() => (confirming = true)}>Remove</button>
      {/if}
    {/if}
  </div>
</li>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    min-height: 64px;
    padding: var(--space-3);
    margin: 0 calc(var(--space-3) * -1);
    position: relative;
    animation: enter var(--normal) var(--ease);
  }
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
  .row.confirming {
    background: var(--bg-hover);
  }

  .who {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .name {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .who .meta {
    font-size: var(--text-xs);
  }

  .end {
    display: flex;
    align-items: center;
    gap: var(--space-5);
    margin-left: auto;
    font-size: var(--text-sm);
  }

  .remove {
    opacity: 0;
    transition: opacity var(--fast) ease;
  }
  .row:hover .remove,
  .remove:focus-visible {
    opacity: 1;
  }

  .question {
    color: var(--text);
  }

  .link-state {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--text-faint);
  }
  .link-state.connected {
    color: var(--good);
  }
  .link-state.failed {
    color: var(--bad);
  }

  @keyframes enter {
    from {
      opacity: 0;
      translate: 0 4px;
    }
  }
</style>
