<script lang="ts">
  import { core, type CloseReason, type RoomMember, type RoomSession } from '../core';
  import { plural } from '../format';
  import { app, errorText } from '../state/app.svelte';
  import BlocklistEditor from '../components/BlocklistEditor.svelte';
  import Dialog from '../components/Dialog.svelte';
  import Icon, { type IconName } from '../components/Icon.svelte';
  import MemberTile from '../components/MemberTile.svelte';

  interface Props {
    session: RoomSession;
  }

  let { session }: Props = $props();

  let busy = $state(false);
  let kickTarget = $state<RoomMember | null>(null);
  let blocklistOpen = $state(false);
  let blocklistDraft = $state<string[]>([]);
  let leaveConfirm = $state(false);

  const owner = $derived(session.members.find((m) => m.isOwner));
  const openSlots = $derived(Math.max(0, session.limit - session.members.length));
  const canStart = $derived(session.youAreOwner && session.phase === 'waiting' && session.members.length >= 2);

  const CLOSED: Record<CloseReason, { icon: IconName; title: string; text: string }> = {
    you_left: { icon: 'logout', title: 'You left the room', text: 'You can find or create another room in the lobby.' },
    owner_left: {
      icon: 'logout',
      title: 'The owner closed the room',
      text: 'A room only exists while its owner is there. It was removed from the lobby.',
    },
    kicked: { icon: 'user-x', title: 'You were removed', text: 'The owner removed you from this room.' },
    directory_lost: {
      icon: 'offline',
      title: 'Lost the directory before the room started',
      text: 'Waiting rooms live on the directory. Rooms that already started would have kept going.',
    },
    everyone_left: {
      icon: 'users',
      title: 'Everyone else is gone',
      text: "Nobody is left to talk to directly, so the room ended.",
    },
  };

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

  function kick(alsoBlock: boolean) {
    const target = kickTarget;
    if (!target) return;
    kickTarget = null;
    run(async () => {
      if (alsoBlock) await core.setBlocklist([...session.blocklist, target.profile.id]);
      else await core.kick(target.profile.id);
    });
  }

  function openBlocklist() {
    blocklistDraft = [...session.blocklist];
    blocklistOpen = true;
  }

  function saveBlocklist() {
    blocklistOpen = false;
    run(() => core.setBlocklist(blocklistDraft));
  }

  function leave() {
    leaveConfirm = false;
    run(() => core.leaveRoom());
  }
</script>

<section class="view">
  <header class="header">
    <button class="icon-btn" type="button" aria-label="Back to lobby" title="Back to lobby" onclick={() => (app.view = 'browse')}>
      <Icon name="back" size={18} />
    </button>
    <h2 title={session.title}>{session.title}</h2>
    <div class="badges">
      <span class="badge">
        <Icon name={session.visibility === 'public' ? 'globe' : 'heart'} size={11} />
        {session.visibility === 'public' ? 'Public' : 'Friends'}
      </span>
      {#if session.hasPassword}<span class="badge"><Icon name="lock" size={11} />Password</span>{/if}
      <span class="badge"><Icon name="users" size={11} />{session.members.length}/{session.limit}</span>
    </div>
    <div class="header-end">
      {#if session.phase === 'waiting'}
        <span class="badge badge-warning">Waiting to start</span>
      {:else if session.phase === 'connecting'}
        <span class="badge badge-accent"><Icon name="loader" size={11} class="spin" />Connecting</span>
      {:else if session.phase === 'started'}
        <span class="badge badge-success"><Icon name="zap" size={11} />Peer-to-peer</span>
      {/if}
    </div>
  </header>

  <div class="content">
    {#if session.phase === 'closed' && session.closedReason}
      {@const info = CLOSED[session.closedReason]}
      <div class="closed">
        <span class="closed-icon"><Icon name={info.icon} size={28} /></span>
        <h3>{info.title}</h3>
        <p>{info.text}</p>
        <button class="btn btn-primary" type="button" onclick={() => app.dismissClosedSession()}>Back to lobby</button>
      </div>
    {:else}
      <div class="intro">
        {#if session.phase === 'waiting'}
          {#if session.youAreOwner}
            <h3>Your room is open</h3>
            <p>
              It's listed in the lobby. Press <strong>Start</strong> when everyone's here. It will
              leave the lobby, and everyone will connect to each other directly.
            </p>
          {:else}
            <h3>Waiting for {owner?.profile.nickname ?? 'the owner'} to start</h3>
            <p>Only the owner can start the room. Once it starts, everyone connects directly and the directory is out of the picture.</p>
          {/if}
        {:else if session.phase === 'connecting'}
          <h3>Connecting directly…</h3>
          <p>The room left the lobby. Each person is connecting straight to every other person. No relay is used.</p>
        {:else}
          <h3>You're connected peer-to-peer</h3>
          <p>Nothing passes through the directory anymore. Chat, files and calls will go here.</p>
        {/if}
      </div>

      <ul class="members" aria-label="People in the room">
        {#each session.members as member (member.profile.id)}
          <MemberTile
            {member}
            phase={session.phase}
            canKick={session.youAreOwner && session.phase !== 'connecting'}
            onkick={(m) => (kickTarget = m)}
          />
        {/each}
        {#if session.phase === 'waiting'}
          {#each Array(openSlots) as _, i (i)}
            <li class="open-slot">
              <span class="open-ring"><Icon name="plus" size={18} /></span>
              <span>Open spot</span>
            </li>
          {/each}
        {/if}
      </ul>

      {#if session.phase === 'started'}
        <div class="chat-placeholder" aria-hidden="true">
          <Icon name="chat" size={20} />
          <span>Chat comes next. This is where messages will appear.</span>
        </div>
      {/if}
    {/if}
  </div>

  {#if session.phase !== 'closed'}
    <footer class="actions">
      {#if session.youAreOwner && session.phase === 'waiting'}
        <button class="btn btn-ghost" type="button" onclick={openBlocklist}>
          <Icon name="ban" size={16} />Blocklist
          {#if session.blocklist.length}<span class="badge badge-danger">{session.blocklist.length}</span>{/if}
        </button>
      {/if}
      <span class="spacer"></span>
      {#if session.youAreOwner && session.phase === 'waiting'}
        <span class="hint">
          {session.members.length < 2 ? 'Waiting for someone to join' : `${plural(session.members.length, 'person', 'people')} ready`}
        </span>
      {/if}
      <button class="btn btn-danger-ghost" type="button" disabled={busy} onclick={() => (leaveConfirm = true)}>
        <Icon name="logout" size={16} />{session.youAreOwner && session.phase === 'waiting' ? 'Close room' : 'Leave'}
      </button>
      {#if session.youAreOwner && session.phase === 'waiting'}
        <button class="btn btn-primary start" type="button" disabled={!canStart || busy} onclick={() => run(() => core.startRoom())}>
          <Icon name="play" size={16} />Start
        </button>
      {/if}
    </footer>
  {/if}
</section>

<Dialog open={kickTarget !== null} title="Remove {kickTarget?.profile.nickname ?? ''}?" width="sm" onclose={() => (kickTarget = null)}>
  <p class="dialog-text">
    Removing lets them try to join again. Blocking also adds their identity to this room's blocklist, so
    they're refused even with a new nickname.
  </p>
  {#snippet footer()}
    <button class="btn btn-ghost" type="button" onclick={() => (kickTarget = null)}>Cancel</button>
    <button class="btn btn-secondary" type="button" onclick={() => kick(false)}>Remove</button>
    <button class="btn btn-danger" type="button" onclick={() => kick(true)}>Remove &amp; block</button>
  {/snippet}
</Dialog>

<Dialog open={blocklistOpen} title="Blocklist" subtitle="Identities refused at the door. Kept only on your PC." onclose={() => (blocklistOpen = false)}>
  <BlocklistEditor bind:blocked={blocklistDraft} exclude={app.me ? [app.me.id] : []} />
  {#snippet footer()}
    <button class="btn btn-ghost" type="button" onclick={() => (blocklistOpen = false)}>Cancel</button>
    <button class="btn btn-primary" type="button" onclick={saveBlocklist}>Save</button>
  {/snippet}
</Dialog>

<Dialog
  open={leaveConfirm}
  title={session.youAreOwner && session.phase === 'waiting' ? 'Close this room?' : 'Leave this room?'}
  width="sm"
  onclose={() => (leaveConfirm = false)}
>
  <p class="dialog-text">
    {#if session.youAreOwner && session.phase === 'waiting'}
      The room is removed from the lobby and everyone waiting is sent back.
    {:else if session.phase === 'started'}
      You'll disconnect from everyone. Rejoining a started room isn't possible yet.
    {:else}
      You'll be removed from the room.
    {/if}
  </p>
  {#snippet footer()}
    <button class="btn btn-ghost" type="button" onclick={() => (leaveConfirm = false)}>Stay</button>
    <button class="btn btn-danger" type="button" onclick={leave}>
      {session.youAreOwner && session.phase === 'waiting' ? 'Close room' : 'Leave'}
    </button>
  {/snippet}
</Dialog>

<style>
  .view {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
  }

  .header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: var(--header-height);
    padding: 0 var(--space-3);
    border-bottom: 1px solid var(--divider);
    box-shadow: 0 1px 0 rgb(0 0 0 / 0.15);
    flex-shrink: 0;
  }
  h2 {
    min-width: 0;
    font-size: var(--text-lg);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .badges {
    display: flex;
    gap: var(--space-1);
    margin-left: var(--space-2);
  }
  .header-end {
    margin-left: auto;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-8) var(--space-6);
  }

  .intro {
    max-width: 560px;
    margin: 0 auto var(--space-6);
    text-align: center;
  }
  .intro h3 {
    font-size: var(--text-2xl);
    margin-bottom: var(--space-2);
  }
  .intro p {
    color: var(--text-muted);
  }

  .members {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 200px));
    justify-content: center;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .open-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: 150px;
    border: 2px dashed var(--border);
    border-radius: var(--radius-lg);
    color: var(--text-faint);
    font-size: var(--text-sm);
  }
  .open-ring {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--bg-sidebar);
  }

  .chat-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    max-width: 560px;
    margin: var(--space-8) auto 0;
    padding: var(--space-6);
    border: 2px dashed var(--border);
    border-radius: var(--radius-lg);
    color: var(--text-faint);
  }

  .closed {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    max-width: 420px;
    margin: 64px auto 0;
    text-align: center;
  }
  .closed h3 {
    font-size: var(--text-xl);
  }
  .closed p {
    color: var(--text-muted);
    margin-bottom: var(--space-2);
  }
  .closed-icon {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--bg-raised);
    color: var(--text-muted);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--divider);
    background: var(--bg-sidebar);
    flex-shrink: 0;
  }
  .spacer {
    flex: 1;
  }
  .hint {
    font-size: var(--text-sm);
    color: var(--text-faint);
    margin-right: var(--space-2);
  }
  .start {
    min-width: 110px;
  }

  .dialog-text {
    color: var(--text-muted);
  }
</style>
