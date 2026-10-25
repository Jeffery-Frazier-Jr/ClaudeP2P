<script lang="ts">
  import { fly } from 'svelte/transition';
  import { app } from '../state/app.svelte';
  import Icon, { type IconName } from './Icon.svelte';

  const ICONS: Record<string, IconName> = {
    info: 'info',
    success: 'check',
    warning: 'alert',
    error: 'alert',
  };
</script>

<div class="toasts" role="status" aria-live="polite">
  {#each app.toasts as toast (toast.id)}
    <div class={['toast', toast.level]} transition:fly={{ y: 12, duration: 220 }}>
      <span class="icon"><Icon name={ICONS[toast.level] ?? 'info'} size={16} /></span>
      <p>{toast.text}</p>
      <button class="icon-btn close" type="button" aria-label="Dismiss" onclick={() => app.dismissToast(toast.id)}>
        <Icon name="x" size={14} />
      </button>
    </div>
  {/each}
</div>

<style>
  .toasts {
    /* Centered over the main area, above the room action bar */
    position: fixed;
    bottom: 76px;
    left: calc(50% + (var(--rail-width) + var(--sidebar-width)) / 2);
    translate: -50% 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    width: min(440px, calc(100vw - 32px));
    z-index: 50;
    pointer-events: none;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    background: var(--bg-overlay);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-pop);
    pointer-events: auto;
  }
  p {
    flex: 1;
    font-size: var(--text-sm);
  }
  .icon {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .info .icon {
    background: var(--accent-soft);
    color: #c3caff;
  }
  .success .icon {
    background: var(--success-soft);
    color: #7fd69c;
  }
  .warning .icon {
    background: var(--warning-soft);
    color: #f6cc72;
  }
  .error .icon {
    background: var(--danger-soft);
    color: #f58b8d;
  }
  .close {
    width: 26px;
    height: 26px;
  }
</style>
