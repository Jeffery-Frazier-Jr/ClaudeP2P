<script lang="ts">
  import { app } from '../state/app.svelte';
  import Icon from './Icon.svelte';
  import UserPanel from './UserPanel.svelte';

  const PHASE_LABEL = {
    waiting: 'Waiting',
    connecting: 'Connecting',
    started: 'Live',
    closed: 'Closed',
  } as const;
</script>

<aside class="sidebar">
  <header>
    <h1>Rooms</h1>
    <span class="sub">Direct, peer-to-peer</span>
  </header>

  <nav class="nav" aria-label="Rooms">
    <button
      class={['nav-item', { active: app.view === 'browse' }]}
      type="button"
      aria-current={app.view === 'browse' ? 'page' : undefined}
      onclick={() => (app.view = 'browse')}
    >
      <Icon name="globe" size={18} />
      <span class="label">Browse rooms</span>
      {#if app.directory === 'online'}
        <span class="count">{app.listings.length}</span>
      {/if}
    </button>

    {#if app.session}
      <div class="section-title">Your room</div>
      <button
        class={['nav-item', { active: app.view === 'room' }]}
        type="button"
        aria-current={app.view === 'room' ? 'page' : undefined}
        onclick={() => (app.view = 'room')}
      >
        <span class={['dot', app.session.phase]} aria-hidden="true"></span>
        <span class="label">{app.session.title}</span>
        <span class={['phase', app.session.phase]}>{PHASE_LABEL[app.session.phase]}</span>
      </button>
    {/if}

    <div class="section-title">Friends</div>
    <p class="placeholder">Your friends list will live here.</p>
  </nav>

  <UserPanel />
</aside>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    width: var(--sidebar-width);
    background: var(--bg-sidebar);
    flex-shrink: 0;
  }

  header {
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: var(--header-height);
    padding: 0 var(--space-4);
    border-bottom: 1px solid var(--divider);
    box-shadow: 0 1px 0 rgb(0 0 0 / 0.15);
  }
  h1 {
    font-size: var(--text-lg);
  }
  .sub {
    font-size: 11px;
    color: var(--text-faint);
  }

  .nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-3) var(--space-2);
    overflow-y: auto;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    height: 38px;
    padding: 0 var(--space-3);
    border: 0;
    border-radius: var(--radius-md);
    background: none;
    color: var(--text-muted);
    cursor: pointer;
    text-align: left;
    transition:
      background-color var(--fast) ease,
      color var(--fast) ease;
  }
  .nav-item:hover {
    background: var(--bg-raised-hover);
    color: var(--text);
  }
  .nav-item.active {
    background: var(--bg-active);
    color: var(--text);
  }
  .label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }
  .count {
    min-width: 20px;
    padding: 0 6px;
    border-radius: var(--radius-pill);
    background: var(--bg-sunken);
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 700;
    line-height: 18px;
    text-align: center;
  }

  .section-title {
    margin: var(--space-4) var(--space-2) var(--space-1);
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .placeholder {
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-sm);
    color: var(--text-faint);
  }

  .dot {
    width: 8px;
    height: 8px;
    margin: 0 5px;
    border-radius: 50%;
    background: var(--text-faint);
    flex-shrink: 0;
  }
  .dot.waiting {
    background: var(--warning);
  }
  .dot.connecting {
    background: var(--accent);
  }
  .dot.started {
    background: var(--success);
  }

  .phase {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-faint);
  }
  .phase.started {
    color: var(--success);
  }
</style>
