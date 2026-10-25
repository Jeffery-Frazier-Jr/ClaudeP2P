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
  let confirmLeave = $state(false);
  let editingBlocklist = $state(false);
  let blocklistDraft = $state<string[]>([]);

  const owner = $derived(session.members.find((m) => m.isOwner));
  const openSlots = $derived(Math.max(0, session.limit - session.members.length));
  const ownerWaiting = $derived(session.youAreOwner && session.phase === 'waiting');
  const canStart = $derived(ownerWaiting && session.members.length >= 2);

  const CLOSED: Record<CloseReason, { title: string; text: string }> = {
    you_left: { title: 'You left the room', text: 'Find or create another one in the lobby.' },
    owner_left: {
      title: 'The owner closed the room',
      text: 'A room only exists while its owner is there, so it was taken off the list.',
    },
    kicked: { title: 'You were removed', text: 'The owner removed you from this room.' },
    directory_lost: {
      title: 'Lost the directory before the room started',
      text: 'Waiting rooms live on the directory. A room that had already started would have kept going.',
    },
    everyone_left: { title: 'Everyone else is gone', text: 'Nobody is left to talk to directly, so the room ended.' },
  };

  const status = $derived.by(() => {
    if (session.phase === 'waiting') {
      return session.youAreOwner
        ? "Listed in the lobby. Press Start when everyone's here. The room then leaves the list and everyone connects directly."
        : `Waiting for ${owner?.profile.nickname ?? 'the owner'} to start. Only the owner can start the room.`;
    }
    if (session.phase === 'connecting') {
      return 'Off the list and away from the directory. Everyone is connecting straight to everyone else, with no relay.';
    }
    return 'Connected peer-to-peer. Nothing passes through the directory anymore.';
  });

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

  function toggleBlocklist() {
    if (editingBlocklist) {
      run(() => core.setBlocklist(blocklistDraft));
    } else {
      blocklistDraft = [...session.blocklist];
    }
    editingBlocklist = !editingBlocklist;
  }
</script>

{#if session.phase === 'closed' && session.closedReason}
  {@const info = CLOSED[session.closedReason]}
  <div class="page">
    <div class="closed">
      <h1>{info.title}</h1>
      <p>{info.text}</p>
      <button class="btn btn-primary" type="button" onclick={() => app.dismissClosedSession()}>Back to rooms</button>
    </div>
  </div>
{:else}
  <div class="page">
    <aside class="page-aside">
      <button class="link back" type="button" onclick={() => (app.view = 'browse')}>
        <Icon name="back" size={14} />All rooms
      </button>

      <h1 class="title">{session.title}</h1>
      <p class="meta details">
        <span>{session.visibility === 'public' ? 'Public' : 'Friends only'}</span>
        {#if session.hasPassword}<span>Password</span>{/if}
        <span>Up to {session.limit}</span>
      </p>

      <p class={['state', session.phase]}>
        {#if session.phase === 'connecting'}<Icon name="loader" size={14} class="spin" />{/if}
        {session.phase === 'waiting' ? 'Waiting' : session.phase === 'connecting' ? 'Connecting' : 'Live, peer-to-peer'}
      </p>
      <p class="status">{status}</p>

      <div class="actions">
        {#if ownerWaiting}
          <button class="btn btn-primary" type="button" disabled={!canStart || busy} onclick={() => run(() => core.startRoom())}>
            Start room
          </button>
          {#if !canStart}<p class="hint">Start unlocks once someone joins.</p>{/if}
        {/if}

        {#if confirmLeave}
          <p class="confirm">
            {#if ownerWaiting}
              Close the room? Everyone waiting is sent back.
            {:else if session.phase === 'started'}
              Leave? You can't rejoin a started room yet.
            {:else}
              Leave this room?
            {/if}
          </p>
          <div class="confirm-actions">
            <button class="link link-danger" type="button" disabled={busy} onclick={() => run(() => core.leaveRoom())}>
              {ownerWaiting ? 'Close room' : 'Leave'}
            </button>
            <button class="link" type="button" onclick={() => (confirmLeave = false)}>Stay</button>
          </div>
        {:else}
          <button class="link link-danger" type="button" onclick={() => (confirmLeave = true)}>
            {ownerWaiting ? 'Close room' : 'Leave room'}
          </button>
        {/if}
      </div>

      {#if ownerWaiting}
        <div class="blocklist">
          <div class="line">
            <span class="label">Blocklist</span>
            <span class="line-end">
              <span class="count">{session.blocklist.length ? `${session.blocklist.length} blocked` : 'None'}</span>
              <button class="link" type="button" onclick={toggleBlocklist}>{editingBlocklist ? 'Save' : 'Edit'}</button>
            </span>
          </div>
          {#if editingBlocklist}
            <BlocklistEditor bind:blocked={blocklistDraft} exclude={app.me ? [app.me.id] : []} />
          {/if}
        </div>
      {/if}
    </aside>

    <section aria-labelledby="people-heading">
      <div class="heading">
        <h2 id="people-heading">People</h2>
        <span class="count">{session.members.length} of {session.limit}</span>
      </div>

      <ul class="people">
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
            <li class="open">Open spot</li>
          {/each}
        {/if}
      </ul>

      {#if session.phase === 'started'}
        <p class="chat-note">The chat goes here next.</p>
      {/if}
    </section>
  </div>
{/if}

<style>
  .back {
    margin-bottom: var(--space-6);
    font-size: var(--text-sm);
  }

  .title {
    font-size: var(--text-2xl);
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
  }
  .details {
    margin-top: var(--space-2);
  }

  .state {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-8);
    font-weight: 500;
  }
  .state.waiting {
    color: var(--warn);
  }
  .state.started {
    color: var(--good);
  }
  .status {
    margin-top: var(--space-1);
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  .actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-4);
    margin-top: var(--space-8);
  }
  .actions .btn-primary {
    width: 100%;
  }
  .confirm {
    color: var(--text);
    font-size: var(--text-sm);
  }
  .confirm-actions {
    display: flex;
    gap: var(--space-5);
    margin-top: calc(var(--space-2) * -1);
  }

  .blocklist {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-top: var(--space-8);
    padding-top: var(--space-6);
    border-top: 1px solid var(--line);
  }
  .line {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .line-end {
    display: flex;
    gap: var(--space-3);
    font-size: var(--text-sm);
  }
  .line-end .count {
    color: var(--text-faint);
  }

  .heading {
    display: flex;
    align-items: baseline;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }
  h2 {
    font-size: var(--text-xl);
  }
  .heading .count {
    color: var(--text-faint);
    font-size: var(--text-sm);
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

  .chat-note {
    margin-top: var(--space-8);
    color: var(--text-faint);
  }

  .closed {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
    max-width: 520px;
    margin: var(--space-12) auto 0;
  }
  .closed h1 {
    font-size: var(--text-2xl);
  }
  .closed p {
    color: var(--text-muted);
    margin-bottom: var(--space-3);
  }
</style>
