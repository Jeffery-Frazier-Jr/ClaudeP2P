// The one place the UI gets its backend from.
// When the Rust backend exists, this file switches to it; nothing else changes.

import { MockCore } from './mock';
import type { Core } from './types';

export const mock = new MockCore();
export const core: Core = mock;

export * from './types';
