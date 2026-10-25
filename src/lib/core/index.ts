// The one place the UI gets its backend from.
// When the Rust backend exists, this file switches to it; nothing else changes.

import { MockCore } from './mock';
import type { Core } from './types';

export const mock = new MockCore();
export const core: Core = mock;

// The dev server swaps modules without reloading the page; stop the old
// fake backend's timers so they don't pile up.
import.meta.hot?.dispose(() => mock.dispose());

export * from './types';
