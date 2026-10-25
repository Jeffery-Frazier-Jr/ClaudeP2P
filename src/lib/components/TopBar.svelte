<script lang="ts">
  import { core, NICKNAME_MAX } from '../core';
  import { app, errorText } from '../state/app.svelte';
  import Avatar from './Avatar.svelte';

  interface Props {
    devOpen: boolean;
    ontoggledev: () => void;
  }

  let { devOpen, ontoggledev }: Props = $props();

  let editing = $state(false);
  let draft = $state('');
  let saving = $state(false);
  let error = $state('');
  let input: HTMLInputElement | undefined = $state();

  function startEditing() {
    if (!app.me) return;
    draft = app.me.nickname;
    error = '';
    editing = true;
    queueMicrotask(() => input?.select());
  }

  async function save() {
    if (!app.me || saving) return;
    if (draft.trim() === app.me.nickname) {
      editing = false;
      return;
    }
    saving = true;
    try {
      await core.setNickname(draft);
      editing = false;
    } catch (e) {
      error = errorText(e);
    } finally {
      saving = false;
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') save();
    if (event.key === 'Escape') editing = false;
  }
</script>

<header class="topbar">
  <div class="inner">
    <span class="brand">ClaudeP2P</span>

    <nav class="tabs" aria-label="Sections">
      <button class="tab current" type="button" aria-current="page">Rooms</button>
      <button class="tab" type="button" disabled title="Servers are coming later">Servers</button>
      <button class="tab" type="button" disabled title="Profile is coming later">Profile</button>
    </nav>

    <div class="end">
      {#if import.meta.env.DEV}
        <button class={['link', 'sim', { on: devOpen }]} type="button" aria-pressed={devOpen} onclick={ontoggledev}>
          Simulator
        </button>
      {/if}

      {#if app.me}
        <div class="me">
          <Avatar profile={app.me} size="sm" />
          {#if editing}
            <input
              bind:this={input}
              bind:value={draft}
              class="input nick-input"
              maxlength={NICKNAME_MAX}
              aria-label="Nickname"
              aria-invalid={error ? 'true' : undefined}
              disabled={saving}
              onkeydown={onKeydown}
              onblur={save}
            />
          {:else}
            <button class="nick" type="button" title="Change your nickname. Your identity stays the same." onclick={startEditing}>
              {app.me.nickname}
            </button>
          {/if}
          <span class="tag" title="Made from your key. Nobody else can have it.">#{app.me.tag}</span>
        </div>
      {/if}
    </div>
  </div>
  {#if error}<p class="error-text nick-error" role="alert">{error}</p>{/if}
</header>

<style>
  .topbar {
    position: relative;
    border-bottom: 1px solid var(--line);
    flex-shrink: 0;
  }
  .inner {
    display: flex;
    align-items: center;
    gap: var(--space-10);
    max-width: var(--content-width);
    height: var(--topbar-height);
    margin: 0 auto;
    padding: 0 var(--space-10);
  }

  .brand {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .tabs {
    display: flex;
    gap: var(--space-6);
    align-self: stretch;
  }
  .tab {
    position: relative;
    padding: 0;
    border: 0;
    background: none;
    color: var(--text-faint);
    cursor: pointer;
  }
  .tab:hover:not(:disabled) {
    color: var(--text-muted);
  }
  .tab:disabled {
    cursor: default;
    opacity: 0.6;
  }
  .tab.current {
    color: var(--text);
  }
  .tab.current::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2px;
    background: var(--text);
  }

  .end {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    margin-left: auto;
  }

  .sim {
    font-size: var(--text-sm);
  }
  .sim.on {
    color: var(--warn);
  }

  .me {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .nick {
    padding: 0;
    border: 0;
    background: none;
    font-weight: 500;
    cursor: text;
  }
  .nick:hover {
    text-decoration: underline;
    text-decoration-color: var(--text-faint);
    text-underline-offset: 3px;
  }
  .nick-input {
    width: 160px;
    height: 28px;
  }
  .me .tag {
    font-size: var(--text-xs);
  }

  .nick-error {
    position: absolute;
    right: var(--space-10);
    top: calc(var(--topbar-height) - 4px);
  }
</style>
