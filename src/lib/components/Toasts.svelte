<script lang="ts">
  import { fly } from 'svelte/transition';
  import { app } from '../state/app.svelte';
  import Icon from './Icon.svelte';
</script>

<div class="toasts" role="status" aria-live="polite">
  {#each app.toasts as toast (toast.id)}
    <div class={['toast', toast.level]} transition:fly={{ y: 8, duration: 200 }}>
      <p>{toast.text}</p>
      <button class="icon-btn" type="button" aria-label="Dismiss" onclick={() => app.dismissToast(toast.id)}>
        <Icon name="x" size={14} />
      </button>
    </div>
  {/each}
</div>

<style>
  /* Bottom-left, out of the way of the list and the actions */
  .toasts {
    position: fixed;
    left: var(--space-6);
    bottom: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    width: min(380px, calc(100vw - 48px));
    z-index: 50;
    pointer-events: none;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
    border-left: 2px solid var(--text-faint);
    background: var(--bg-input);
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.35);
    pointer-events: auto;
  }
  .toast.success {
    border-left-color: var(--good);
  }
  .toast.warning {
    border-left-color: var(--warn);
  }
  .toast.error {
    border-left-color: var(--bad);
  }
  p {
    flex: 1;
    font-size: var(--text-sm);
    color: var(--text-muted);
  }
</style>
