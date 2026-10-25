<script lang="ts">
  import { mock } from '../core';
  import { MOCK_PASSWORD } from '../core/mock';
  import { app } from '../state/app.svelte';
  import Icon from './Icon.svelte';

  // Design-mode only. Forces the situations the real network will produce so
  // we can design every screen, not just the happy path.

  interface Props {
    onclose: () => void;
  }

  let { onclose }: Props = $props();

  let failNext = $state(mock.failNextLinkEnabled);
  let live = $state(mock.liveActivityEnabled);

  // The fake backend clears this flag once a start uses it.
  $effect(() => {
    void app.session?.phase;
    failNext = mock.failNextLinkEnabled;
  });

  const s = mock.simulate;
  const session = $derived(app.session && app.session.phase !== 'closed' ? app.session : null);
</script>

<aside class="dev" aria-label="Simulator">
  <header>
    <Icon name="wrench" size={14} />
    <span>Simulator</span>
    <span class="mode">design mode</span>
    <button class="icon-btn close" type="button" aria-label="Close simulator" onclick={onclose}>
      <Icon name="x" size={14} />
    </button>
  </header>

  <div class="group">
    <span class="label">Directory</span>
    <div class="row">
      <button type="button" disabled={app.directory === 'offline'} onclick={s.directoryOffline}>Go offline</button>
      <button type="button" disabled={app.directory !== 'offline'} onclick={s.directoryOnline}>Come back</button>
    </div>
  </div>

  <div class="group">
    <span class="label">Lobby</span>
    <div class="row">
      <button type="button" onclick={s.clearLobby}>Empty it</button>
      <button type="button" onclick={s.refillLobby}>Add rooms</button>
      <button type="button" class={{ on: live }} aria-pressed={live} onclick={() => (live = s.toggleLiveActivity())}>
        Live activity
      </button>
    </div>
  </div>

  <div class="group">
    <span class="label">In a room</span>
    <div class="row">
      <button type="button" disabled={session?.phase !== 'waiting'} onclick={s.peerJoins}>Someone joins</button>
      <button type="button" disabled={!session} onclick={s.peerLeaves}>Someone leaves</button>
    </div>
    <div class="row">
      <button type="button" disabled={!session || session.youAreOwner || session.phase !== 'waiting'} onclick={s.ownerStarts}>
        Owner starts
      </button>
      <button type="button" disabled={!session || session.youAreOwner || session.phase !== 'waiting'} onclick={s.ownerLeaves}>
        Owner leaves
      </button>
      <button type="button" disabled={!session || session.youAreOwner} onclick={s.kickMe}>Kick me</button>
    </div>
  </div>

  <div class="group">
    <span class="label">Next start</span>
    <div class="row">
      <button type="button" class={{ on: failNext }} aria-pressed={failNext} onclick={() => (failNext = s.toggleFailNextLink())}>
        One direct connection fails
      </button>
    </div>
  </div>

  <p class="note">Locked rooms use the password <code>{MOCK_PASSWORD}</code>. One room's owner has you blocked.</p>
</aside>

<style>
  .dev {
    position: fixed;
    right: var(--space-6);
    bottom: var(--space-6);
    width: 300px;
    padding: var(--space-3);
    border-left: 2px solid var(--warn);
    background: var(--bg-input);
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.35);
    z-index: 40;
    font-size: var(--text-xs);
  }

  header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    color: var(--warn);
    font-weight: 700;
  }
  .mode {
    color: var(--text-faint);
    font-weight: 400;
  }
  .close {
    margin-left: auto;
    width: 24px;
    height: 24px;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2) 0;
    border-top: 1px solid var(--line);
  }
  .label {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-faint);
    font-size: 10px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .row button {
    height: 26px;
    padding: 0 var(--space-2);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: transparent;
    font-size: var(--text-xs);
    cursor: pointer;
  }
  .row button:hover:not(:disabled) {
    border-color: var(--text-faint);
  }
  .row button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .row button.on {
    border-color: var(--warn);
    color: var(--warn);
  }

  .note {
    padding-top: var(--space-2);
    border-top: 1px solid var(--line);
    color: var(--text-faint);
  }
  code {
    font-family: var(--font-mono);
    color: var(--text);
  }
</style>
