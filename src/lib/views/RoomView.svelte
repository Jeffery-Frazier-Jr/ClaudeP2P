<script lang="ts">
  import { core, type CloseReason, type RoomMember, type RoomSession } from '../core';
  import { app, errorText } from '../state/app.svelte';
  import BlocklistEditor from '../components/BlocklistEditor.svelte';
  import Icon from '../components/Icon.svelte';
  import MemberRow from '../components/MemberRow.svelte';

  interface Props {
    session: RoomSession;
  }

  let { session }: Props = $props();

  let busy = $state(false);
  let menu: HTMLDivElement | undefined = $state();
  let menuView = $state<'actions' | 'leave' | 'blocklist'>('actions');
  let blocklistDraft = $state<string[]>([]);

  const openSlots = $derived(Math.max(0, session.limit - session.members.length));
  const ownerWaiting = $derived(session.youAreOwner && session.phase === 'waiting');
  const canStart = $derived(ownerWaiting && session.members.length >= 2);

  const CLOSED: Record<CloseReason, string> = {
    you_left: 'You left the room.',
    owner_left: 'The owner closed the room.',
    kicked: 'You were removed from the room.',
    directory_lost: 'Lost the directory before the room started.',
    everyone_left: 'Everyone else left.',
  };

  const STATE = { waiting: 'Waiting', connecting: 'Connecting', started: 'Live', closed: 'Closed' } as const;

  async function run(action: () => Promise<void>) {
    busy = true;
    try {
      await action();
    } catch (e) {
      app.toast('error', errorText(e));
    } finally {
      busy = false;
    }
  }

  function remove(member: RoomMember, alsoBlock: boolean) {
    run(() =>
      alsoBlock ? core.setBlocklist([...session.blocklist, member.profile.id]) : core.kick(member.profile.id),
    );
  }

  function onMenuToggle(event: ToggleEvent) {
    if (event.newState === 'open') menuView = 'actions';
  }

  function openBlocklist() {
    blocklistDraft = [...session.blocklist];
    menuView = 'blocklist';
  }

  function saveBlocklist() {
    menu?.hidePopover();
    run(() => core.setBlocklist(blocklistDraft));
  }

  function leave() {
    menu?.hidePopover();
    run(() => core.leaveRoom());
  }
</script>

<div class="page">
  {#if session.phase === 'closed' && session.closedReason}
    <div class="closed">
      <p>{CLOSED[session.closedReason]}</p>
      <button class="btn" type="button" onclick={() => app.dismissClosedSession()}>Back to rooms</button>
    </div>
  {:else}
    <button class="link back" type="button" onclick={() => (app.view = 'browse')}>
      <Icon name="back" size={14} />Rooms
    </button>

    <header class="head">
      <div class="head-text">
        <h1>{session.title}</h1>
        <p class="meta">
          <span class={['state', session.phase]}>
            {#if session.phase === 'connecting'}<Icon name="loader" size={12} class="spin" />{/if}
            {STATE[session.phase]}
          </span>
          <span>{session.members.length} of {session.limit}</span>
          {#if session.visibility === 'friends'}<span>Friends</span>{/if}
          {#if session.hasPassword}<span class="lock"><Icon name="lock" size={12} label="Password" /></span>{/if}
        </p>
      </div>

      <div class="head-actions">
        {#if ownerWaiting}
          <button
            class="btn btn-primary"
            type="button"
            disabled={!canStart || busy}
            title={canStart ? undefined : 'Waiting for someone to join'}
            onclick={() => run(() => core.startRoom())}
          >
            Start
          </button>
        {/if}
        <button class="icon-btn more" type="button" popovertarget="room-menu" aria-label="Room options">
          <Icon name="more" size={18} />
        </button>
      </div>
    </header>

    <div bind:this={menu} id="room-menu" class="menu room-menu" popover="auto" ontoggle={onMenuToggle}>
      {#if menuView === 'actions'}
        {#if ownerWaiting}
          <button class="menu-row" type="button" onclick={openBlocklist}>
            Blocklist
            {#if session.blocklist.length}<span class="faint">{session.blocklist.length}</span>{/if}
          </button>
          <div class="menu-sep"></div>
        {/if}
        <button class="menu-row danger" type="button" onclick={() => (menuView = 'leave')}>
          {ownerWaiting ? 'Close room' : 'Leave room'}
        </button>
      {:else if menuView === 'leave'}
        <p class="confirm">{ownerWaiting ? 'Close this room?' : 'Leave this room?'}</p>
        <div class="confirm-actions">
          <button class="btn btn-sm btn-danger" type="button" disabled={busy} onclick={leave}>
            {ownerWaiting ? 'Close' : 'Leave'}
          </button>
          <button class="link" type="button" onclick={() => (menuView = 'actions')}>Cancel</button>
        </div>
      {:else}
        <p class="menu-title">Blocklist</p>
        <BlocklistEditor bind:blocked={blocklistDraft} exclude={app.me ? [app.me.id] : []} />
        <div class="confirm-actions">
          <button class="btn btn-sm btn-primary" type="button" onclick={saveBlocklist}>Save</button>
          <button class="link" type="button" onclick={() => (menuView = 'actions')}>Cancel</button>
        </div>
      {/if}
    </div>

    <ul class="people" aria-label="People">
      {#each session.members as member (member.profile.id)}
        <MemberRow
          {member}
          phase={session.phase}
          canRemove={session.youAreOwner && session.phase !== 'connecting'}
          onremove={remove}
        />
      {/each}
      {#if session.phase === 'waiting'}
        {#each Array(openSlots) as _, i (i)}
          <li class="open">Open</li>
        {/each}
      {/if}
    </ul>
  {/if}
</div>

<style>
  .back {
    margin-bottom: var(--space-6);
    font-size: var(--text-sm);
  }

  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-6);
    margin-bottom: var(--space-8);
  }
  .head-text {
    min-width: 0;
  }
  h1 {
    font-size: var(--text-2xl);
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
  }
  .head .meta {
    margin-top: var(--space-1);
  }
  .lock {
    display: inline-flex;
    align-items: center;
  }
  .state {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }
  .state.waiting {
    color: var(--warn);
  }
  .state.started {
    color: var(--good);
  }

  .head-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }
  .more {
    anchor-name: --room-menu;
    width: 38px;
    height: 38px;
  }

  .room-menu {
    position-anchor: --room-menu;
    inset: auto;
    top: anchor(bottom);
    right: anchor(right);
    width: 280px;
    margin-top: var(--space-2);
  }
  .faint {
    color: var(--text-faint);
  }
  .confirm {
    margin-bottom: var(--space-3);
  }
  .confirm-actions {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-top: var(--space-3);
  }

  .people {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--line);
  }
  .open {
    display: flex;
    align-items: center;
    min-height: 64px;
    padding-left: 48px;
    border-bottom: 1px dashed var(--line);
    color: var(--text-faint);
    font-size: var(--text-sm);
  }

  .closed {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-5);
    padding-top: var(--space-10);
    font-size: var(--text-xl);
  }
</style>
