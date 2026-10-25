<script lang="ts">
  import type { Profile } from '../core';

  interface Props {
    profile: Profile;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  }

  let { profile, size = 'md' }: Props = $props();

  // Color comes from the key, so it is stable and cannot be spoofed by a
  // nickname. Custom profile pictures will replace this later.
  const colorIndex = $derived(parseInt(profile.id.slice(-2), 16) % 8);

  const initials = $derived.by(() => {
    const words = profile.nickname.trim().split(/[\s._-]+/).filter(Boolean);
    const letters = words.length > 1 ? (words[0]?.[0] ?? '') + (words[1]?.[0] ?? '') : profile.nickname.slice(0, 2);
    return letters.toUpperCase();
  });
</script>

<span class={['avatar', size, `c${colorIndex}`]} aria-hidden="true">{initials}</span>

<style>
  .avatar {
    display: inline-grid;
    place-items: center;
    flex-shrink: 0;
    border-radius: 50%;
    color: #fff;
    font-weight: 600;
    user-select: none;
  }
  .xs {
    width: 20px;
    height: 20px;
    font-size: 9px;
  }
  .sm {
    width: 24px;
    height: 24px;
    font-size: 10px;
  }
  .md {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }
  .lg {
    width: 48px;
    height: 48px;
    font-size: 17px;
  }
  .xl {
    width: 72px;
    height: 72px;
    font-size: 24px;
  }
  .c0 { background: var(--avatar-0); }
  .c1 { background: var(--avatar-1); }
  .c2 { background: var(--avatar-2); }
  .c3 { background: var(--avatar-3); }
  .c4 { background: var(--avatar-4); }
  .c5 { background: var(--avatar-5); }
  .c6 { background: var(--avatar-6); }
  .c7 { background: var(--avatar-7); }
</style>
