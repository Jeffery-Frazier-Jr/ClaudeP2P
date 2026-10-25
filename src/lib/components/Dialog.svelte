<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  // Built on the native <dialog> element: it traps focus, closes on Escape
  // and puts everything behind it out of reach, with no extra code.

  interface Props {
    open: boolean;
    title: string;
    subtitle?: string;
    width?: 'sm' | 'md';
    onclose: () => void;
    children: Snippet;
    footer?: Snippet;
  }

  let { open, title, subtitle, width = 'md', onclose, children, footer }: Props = $props();

  let dialog: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });

  function onBackdropClick(event: MouseEvent) {
    if (event.target === dialog) onclose();
  }
</script>

<dialog
  bind:this={dialog}
  class={['dialog', width]}
  aria-labelledby="dialog-title"
  onclose={onclose}
  onclick={onBackdropClick}
>
  {#if open}
    <div class="panel">
      <header>
        <div>
          <h2 id="dialog-title">{title}</h2>
          {#if subtitle}<p class="subtitle">{subtitle}</p>{/if}
        </div>
        <button class="icon-btn" type="button" onclick={onclose} aria-label="Close">
          <Icon name="x" />
        </button>
      </header>
      <div class="body">{@render children()}</div>
      {#if footer}
        <footer>{@render footer()}</footer>
      {/if}
    </div>
  {/if}
</dialog>

<style>
  .dialog {
    padding: 0;
    border: 0;
    border-radius: var(--radius-lg);
    background: var(--bg-main);
    color: var(--text);
    box-shadow: var(--shadow-pop);
    max-height: min(720px, calc(100vh - 48px));
    width: calc(100vw - 32px);
  }
  .sm {
    max-width: 420px;
  }
  .md {
    max-width: 520px;
  }
  .dialog[open] {
    animation: pop var(--normal) var(--ease);
  }
  .dialog::backdrop {
    background: var(--scrim);
    animation: fade var(--normal) ease;
  }

  .panel {
    display: flex;
    flex-direction: column;
    max-height: inherit;
  }

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-5) var(--space-5) var(--space-3) var(--space-6);
  }
  h2 {
    font-size: var(--text-xl);
  }
  .subtitle {
    margin-top: var(--space-1);
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  .body {
    padding: var(--space-2) var(--space-6) var(--space-6);
    overflow-y: auto;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding: var(--space-4) var(--space-6);
    background: var(--bg-sidebar);
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(6px);
    }
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
</style>
