<script lang="ts">
  import { core, NICKNAME_MAX } from '../core';
  import { app, errorText } from '../state/app.svelte';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';

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

{#if app.me}
  <section class="panel" aria-label="Your profile">
    <Avatar profile={app.me} size="md" />
    <div class="who">
      {#if editing}
        <input
          bind:this={input}
          bind:value={draft}
          class="nick-input"
          maxlength={NICKNAME_MAX}
          aria-label="Nickname"
          aria-invalid={error ? 'true' : undefined}
          disabled={saving}
          onkeydown={onKeydown}
          onblur={save}
        />
        {#if error}<span class="error">{error}</span>{/if}
      {:else}
        <button class="nick" type="button" onclick={startEditing} title="Change nickname">
          <span class="name">{app.me.nickname}</span>
          <span class="edit"><Icon name="pencil" size={12} /></span>
        </button>
        <span class="tag" title="Your tag comes from your key. Nobody else can have it.">#{app.me.tag}</span>
      {/if}
    </div>
    <button class="icon-btn" type="button" disabled title="Settings (coming soon)" aria-label="Settings">
      <Icon name="sliders" size={18} />
    </button>
  </section>
{/if}

<style>
  .panel {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: 56px;
    padding: 0 var(--space-2);
    background: var(--bg-overlay);
  }

  .who {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }

  .nick {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    max-width: 100%;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    text-align: left;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    font-size: var(--text-sm);
  }
  .edit {
    color: var(--text-faint);
    opacity: 0;
    transition: opacity var(--fast) ease;
  }
  .nick:hover .edit,
  .nick:focus-visible .edit {
    opacity: 1;
  }

  .tag {
    font-size: 11px;
  }

  .nick-input {
    width: 100%;
    height: 24px;
    padding: 0 var(--space-1);
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    background: var(--bg-sunken);
    font-size: var(--text-sm);
    font-weight: 600;
  }
  .nick-input:focus {
    outline: none;
  }
  .error {
    font-size: 11px;
    color: var(--danger);
  }
</style>
