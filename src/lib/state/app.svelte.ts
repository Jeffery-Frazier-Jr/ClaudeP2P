// Reactive app state. Fed only by backend events, so the UI always shows what
// the backend says is true, never what it hoped would happen.

import {
  core,
  CoreError,
  type DirectoryStatus,
  type NoticeLevel,
  type Profile,
  type RoomListing,
  type RoomSession,
} from '../core';

export type View = 'browse' | 'room';

export interface Toast {
  id: number;
  level: NoticeLevel;
  text: string;
}

class AppState {
  me = $state<Profile | null>(null);
  directory = $state<DirectoryStatus>('connecting');
  listings = $state<RoomListing[]>([]);
  session = $state<RoomSession | null>(null);
  view = $state<View>('browse');
  toasts = $state<Toast[]>([]);

  private nextToastId = 1;

  constructor() {
    core.subscribe((event) => {
      switch (event.type) {
        case 'identity':
          this.me = event.identity;
          break;
        case 'directory_status':
          this.directory = event.status;
          break;
        case 'listings':
          this.listings = event.rooms;
          break;
        case 'session': {
          const hadSession = this.session !== null;
          this.session = event.session;
          if (event.session && !hadSession) this.view = 'room';
          if (!event.session) this.view = 'browse';
          break;
        }
        case 'notice':
          this.toast(event.level, event.text);
          break;
      }
    });
  }

  toast(level: NoticeLevel, text: string): void {
    const id = this.nextToastId++;
    this.toasts = [...this.toasts, { id, level, text }].slice(-4);
    setTimeout(() => this.dismissToast(id), level === 'error' || level === 'warning' ? 7000 : 4000);
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  /** A closed session stays visible so the user can read why; this clears it. */
  dismissClosedSession(): void {
    if (this.session?.phase === 'closed') this.session = null;
    this.view = 'browse';
  }
}

export const app = new AppState();

/** Turns any thrown error into a sentence a person can read. */
export function errorText(error: unknown): string {
  if (error instanceof CoreError) return error.message;
  return 'Something went wrong. Please try again.';
}
