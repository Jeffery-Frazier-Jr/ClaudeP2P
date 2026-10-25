<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    devOpen: boolean;
    ontoggledev: () => void;
  }

  let { devOpen, ontoggledev }: Props = $props();
</script>

<nav class="rail" aria-label="Sections">
  <button class="rail-item active" type="button" aria-current="page" title="Rooms">
    <span class="pill" aria-hidden="true"></span>
    <span class="bubble"><Icon name="chat" size={22} /></span>
    <span class="sr-only">Rooms</span>
  </button>

  <div class="divider" role="separator"></div>

  <!-- Reserved for servers. They will be separate, self-hosted services. -->
  <button class="rail-item" type="button" disabled title="Servers are coming later">
    <span class="bubble muted"><Icon name="server" size={20} /></span>
    <span class="sr-only">Servers (coming later)</span>
  </button>
  <button class="rail-item" type="button" disabled title="Join or add a server (coming later)">
    <span class="bubble add"><Icon name="plus" size={20} /></span>
    <span class="sr-only">Add a server (coming later)</span>
  </button>

  <div class="spacer"></div>

  {#if import.meta.env.DEV}
    <button
      class={['rail-item', { active: devOpen }]}
      type="button"
      title="Simulator (design mode only)"
      aria-pressed={devOpen}
      onclick={ontoggledev}
    >
      <span class="bubble dev"><Icon name="wrench" size={18} /></span>
      <span class="sr-only">Simulator</span>
    </button>
  {/if}
</nav>

<style>
  .rail {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    width: var(--rail-width);
    padding: var(--space-3) 0;
    background: var(--bg-rail);
    flex-shrink: 0;
  }

  .rail-item {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }
  .rail-item:disabled {
    cursor: not-allowed;
  }

  .bubble {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--bg-main);
    color: var(--text-muted);
    transition:
      border-radius var(--normal) var(--ease),
      background-color var(--fast) ease,
      color var(--fast) ease;
  }
  .rail-item:hover:not(:disabled) .bubble,
  .rail-item.active .bubble {
    border-radius: var(--radius-xl);
    background: var(--accent);
    color: #fff;
  }
  .bubble.muted,
  .bubble.add {
    opacity: 0.45;
  }
  .bubble.add {
    color: var(--success);
  }
  .rail-item.active .bubble.dev,
  .rail-item:hover .bubble.dev {
    background: var(--warning);
    color: #1e1f22;
  }

  /* The little white bar on the left of the active section, like Discord */
  .pill {
    position: absolute;
    left: 0;
    width: 4px;
    height: 40px;
    border-radius: 0 4px 4px 0;
    background: var(--text);
  }

  .divider {
    width: 32px;
    height: 2px;
    margin: var(--space-1) 0;
    border-radius: 1px;
    background: var(--bg-active);
  }

  .spacer {
    flex: 1;
  }
</style>
