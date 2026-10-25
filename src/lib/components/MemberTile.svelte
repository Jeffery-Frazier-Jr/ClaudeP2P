<script lang="ts">
  import type { RoomMember, RoomPhase } from '../core';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    member: RoomMember;
    phase: RoomPhase;
    canKick: boolean;
    onkick: (member: RoomMember) => void;
  }

  let { member, phase, canKick, onkick }: Props = $props();

  const LINK_TEXT = {
    pending: '',
    connecting: 'Connecting directly…',
    connected: 'Direct connection',
    failed: "Couldn't connect",
  } as const;
</script>

<li class={['tile', member.link, { you: member.isYou }]}>
  <div class="avatar-wrap">
    <Avatar profile={member.profile} size="lg" />
    {#if member.isOwner}
      <span class="crown" title="Room owner"><Icon name="crown" size={12} /></span>
    {/if}
  </div>

  <div class="who">
    <span class="name">
      {member.profile.nickname}
      {#if member.isYou}<span class="badge">You</span>{/if}
    </span>
    <span class="tag">#{member.profile.tag}</span>
  </div>

  {#if phase !== 'waiting' && !member.isYou}
    <span class="link">
      {#if member.link === 'connecting'}
        <Icon name="loader" size={13} class="spin" />
      {:else if member.link === 'connected'}
        <Icon name="zap" size={13} />
      {:else if member.link === 'failed'}
        <Icon name="alert" size={13} />
      {/if}
      {LINK_TEXT[member.link]}
    </span>
  {/if}

  {#if canKick && !member.isYou}
    <button class="kick icon-btn" type="button" title="Remove from room" aria-label="Remove {member.profile.nickname}" onclick={() => onkick(member)}>
      <Icon name="user-x" size={16} />
    </button>
  {/if}
</li>

<style>
  .tile {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-5) var(--space-3) var(--space-4);
    border: 1px solid transparent;
    border-radius: var(--radius-lg);
    background: var(--bg-raised);
    text-align: center;
    animation: enter var(--normal) var(--ease);
  }
  .tile.you {
    border-color: var(--accent-soft);
  }
  .tile.connected {
    border-color: var(--success-soft);
  }
  .tile.failed {
    border-color: var(--danger-soft);
    opacity: 0.7;
  }

  .avatar-wrap {
    position: relative;
  }
  .crown {
    position: absolute;
    top: -4px;
    right: -6px;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border: 3px solid var(--bg-raised);
    border-radius: 50%;
    background: var(--warning);
    color: #1e1f22;
  }

  .who {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
    max-width: 100%;
  }
  .name {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    max-width: 100%;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .who .tag {
    font-size: 11px;
  }

  .link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: var(--text-xs);
    color: var(--text-muted);
  }
  .connected .link {
    color: #7fd69c;
  }
  .failed .link {
    color: #f58b8d;
  }

  .kick {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    width: 28px;
    height: 28px;
    opacity: 0;
    transition: opacity var(--fast) ease;
  }
  .tile:hover .kick,
  .kick:focus-visible {
    opacity: 1;
  }
  .kick:hover:not(:disabled) {
    background: var(--danger-soft);
    color: var(--danger);
  }

  @keyframes enter {
    from {
      opacity: 0;
      transform: scale(0.94);
    }
  }
</style>
