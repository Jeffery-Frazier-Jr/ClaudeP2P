// A fake backend for designing the UI. It behaves like the real one will:
// things take time, rooms come and go, connections can fail. Nothing here
// touches the network. The `simulate` controls let us force the unhappy
// paths on purpose so every screen gets designed, not just the happy one.

import {
  CoreError,
  NICKNAME_MAX,
  PASSWORD_MAX,
  ROOM_TITLE_MAX,
  type Core,
  type CoreEvent,
  type CreateRoomOptions,
  type DirectoryStatus,
  type PeerId,
  type Profile,
  type RoomListing,
  type RoomMember,
  type RoomSession,
} from './types';
import { tagFromId } from './tag';

/** Every mock room with a password uses this one. */
export const MOCK_PASSWORD = 'letmein';

const MAX_ROOMS = 30;

const SAMPLE_NAMES = [
  'SawrToonz',
  'King Art',
  'Dragn',
  'IAmUnknown',
  'Ben',
  'Ambit',
  'Slee6',
  'Guest',
  'Nootmare1183',
  'Velvet',
  'orbit.wav',
  'Kestrel',
];

const SAMPLE_TITLES = [
  'Late night chill',
  'Movie night: bring snacks',
  'Testing the new build',
  'Co-op planning',
  'Just vibing',
  'Study hall (quiet pls)',
  'Album listening party',
  'Design review',
  'Ranked grind',
  'Book club',
];

function randomId(): PeerId {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function makeProfile(nickname: string): Profile {
  const id = randomId();
  return { id, nickname, tag: tagFromId(id) };
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface MockRoom {
  listing: RoomListing;
  password: string | null;
  /** Rooms whose owner has you on their blocklist. */
  refusesYou: boolean;
  members: Profile[];
}

export class MockCore implements Core {
  private listeners = new Set<(event: CoreEvent) => void>();
  private me: Profile = { ...makeProfile('Nightmare1183') };
  private people: Profile[] = SAMPLE_NAMES.map(makeProfile);
  private rooms = new Map<string, MockRoom>();
  private directory: DirectoryStatus = 'connecting';
  private session: RoomSession | null = null;
  private failNextLink = false;
  private liveActivity = true;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private ticker: ReturnType<typeof setInterval>;

  constructor() {
    this.seedRooms();
    this.later(700, () => this.setDirectory('online'));
    this.ticker = setInterval(() => this.liveTick(), 5000);
  }

  /** Stops every timer. Used when the dev server reloads this file. */
  dispose(): void {
    clearInterval(this.ticker);
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    this.listeners.clear();
  }

  // ── Core interface ───────────────────────────────────────────────────────

  async identity(): Promise<Profile> {
    return { ...this.me };
  }

  async setNickname(nickname: string): Promise<Profile> {
    const clean = nickname.trim();
    if (!clean || clean.length > NICKNAME_MAX) {
      throw new CoreError('invalid', `Nicknames are 1–${NICKNAME_MAX} characters.`);
    }
    await wait(150);
    this.me = { ...this.me, nickname: clean };
    this.emit({ type: 'identity', identity: { ...this.me } });
    if (this.session) {
      this.session.members = this.session.members.map((m) =>
        m.isYou ? { ...m, profile: { ...this.me } } : m,
      );
      this.emitSession();
    }
    return { ...this.me };
  }

  async knownPeers(): Promise<Profile[]> {
    return this.people.map((p) => ({ ...p }));
  }

  async reconnectDirectory(): Promise<void> {
    if (this.directory === 'online') return;
    this.simulate.directoryOnline();
  }

  async createRoom(options: CreateRoomOptions): Promise<RoomSession> {
    this.requireNoSession();
    this.requireOnline();
    const title = options.title.trim();
    if (!title || title.length > ROOM_TITLE_MAX) {
      throw new CoreError('invalid', `Room titles are 1–${ROOM_TITLE_MAX} characters.`);
    }
    if (options.password !== null && (options.password.length < 1 || options.password.length > PASSWORD_MAX)) {
      throw new CoreError('invalid', 'That password is not allowed.');
    }
    await wait(400);
    const listing: RoomListing = {
      id: randomId().slice(0, 16),
      title,
      owner: { ...this.me },
      memberCount: 1,
      limit: options.limit,
      hasPassword: options.password !== null,
      visibility: options.visibility,
      createdAt: Date.now(),
    };
    this.rooms.set(listing.id, {
      listing,
      password: options.password,
      refusesYou: false,
      members: [{ ...this.me }],
    });
    this.session = {
      id: listing.id,
      title,
      limit: options.limit,
      hasPassword: listing.hasPassword,
      visibility: options.visibility,
      phase: 'waiting',
      members: [this.member(this.me, true, true)],
      youAreOwner: true,
      blocklist: [...options.blocklist],
      closedReason: null,
    };
    this.emitListings();
    this.emitSession();
    // Someone notices the new room after a moment.
    this.later(2500, () => this.simulate.peerJoins());
    return this.snapshot();
  }

  async joinRoom(roomId: string, password: string | null): Promise<RoomSession> {
    this.requireNoSession();
    this.requireOnline();
    await wait(700);
    const room = this.rooms.get(roomId);
    if (!room) throw new CoreError('closed', 'That room has closed.');
    if (room.listing.owner.id === this.me.id) throw new CoreError('invalid', 'This is your room.');
    if (room.refusesYou) throw new CoreError('refused', "The room's owner didn't let you in.");
    if (room.members.length >= room.listing.limit) throw new CoreError('full', 'That room is full.');
    if (room.password !== null && password !== room.password) {
      throw new CoreError('wrong_password', 'Wrong password.');
    }
    room.members.push({ ...this.me });
    room.listing.memberCount = room.members.length;
    this.session = {
      id: room.listing.id,
      title: room.listing.title,
      limit: room.listing.limit,
      hasPassword: room.listing.hasPassword,
      visibility: room.listing.visibility,
      phase: 'waiting',
      members: room.members.map((p) =>
        this.member(p, p.id === room.listing.owner.id, p.id === this.me.id),
      ),
      youAreOwner: false,
      blocklist: [],
      closedReason: null,
    };
    this.emitListings();
    this.emitSession();
    return this.snapshot();
  }

  async leaveRoom(): Promise<void> {
    const session = this.requireSession();
    await wait(200);
    this.removeFromRoom(session.id, this.me.id);
    if (session.youAreOwner) this.rooms.delete(session.id);
    this.session = null;
    this.emitListings();
    this.emit({ type: 'session', session: null });
  }

  async kick(peerId: PeerId): Promise<void> {
    const session = this.requireOwner();
    const target = session.members.find((m) => m.profile.id === peerId);
    if (!target || target.isYou) throw new CoreError('invalid', 'That person is not in the room.');
    await wait(200);
    session.members = session.members.filter((m) => m.profile.id !== peerId);
    this.removeFromRoom(session.id, peerId);
    this.emitListings();
    this.emitSession();
    this.notice('info', `${target.profile.nickname} was removed from the room.`);
  }

  async startRoom(): Promise<void> {
    const session = this.requireOwner();
    if (session.phase !== 'waiting') throw new CoreError('invalid', 'The room already started.');
    if (session.members.length < 2) throw new CoreError('invalid', 'Wait for someone to join first.');
    await wait(300);
    this.rooms.delete(session.id);
    this.emitListings();
    this.beginDirectConnections(session);
  }

  async setBlocklist(peerIds: PeerId[]): Promise<void> {
    const session = this.requireOwner();
    session.blocklist = [...new Set(peerIds)];
    const blocked = session.members.filter((m) => !m.isYou && session.blocklist.includes(m.profile.id));
    for (const m of blocked) await this.kick(m.profile.id);
    this.emitSession();
  }

  subscribe(listener: (event: CoreEvent) => void): () => void {
    this.listeners.add(listener);
    listener({ type: 'identity', identity: { ...this.me } });
    listener({ type: 'directory_status', status: this.directory });
    listener({ type: 'listings', rooms: this.publicListings() });
    listener({ type: 'session', session: this.session ? this.snapshot() : null });
    return () => this.listeners.delete(listener);
  }

  // ── Simulator (dev only) ─────────────────────────────────────────────────

  readonly simulate = {
    directoryOffline: () => this.setDirectory('offline'),
    directoryOnline: () => {
      this.setDirectory('connecting');
      this.later(600, () => this.setDirectory('online'));
    },
    peerJoins: () => {
      const s = this.session;
      if (!s || s.phase !== 'waiting' || s.members.length >= s.limit) return;
      const inRoom = new Set(s.members.map((m) => m.profile.id));
      const candidates = this.people.filter((p) => !inRoom.has(p.id) && !s.blocklist.includes(p.id));
      if (!candidates.length) return;
      const person = pick(candidates);
      s.members.push(this.member(person, false, false));
      this.rooms.get(s.id)?.members.push(person);
      this.syncCount(s.id);
      this.emitSession();
      this.notice('info', `${person.nickname} joined.`);
    },
    peerLeaves: () => {
      const s = this.session;
      if (!s) return;
      const other = s.members.find((m) => !m.isYou && !m.isOwner);
      if (!other) return;
      s.members = s.members.filter((m) => m !== other);
      this.removeFromRoom(s.id, other.profile.id);
      this.emitSession();
      this.notice('info', `${other.profile.nickname} left.`);
      if (s.phase === 'started' && s.members.length < 2) this.close('everyone_left');
    },
    ownerStarts: () => {
      const s = this.session;
      if (!s || s.youAreOwner || s.phase !== 'waiting') return;
      this.rooms.delete(s.id);
      this.emitListings();
      this.beginDirectConnections(s);
    },
    ownerLeaves: () => {
      const s = this.session;
      if (!s || s.youAreOwner || s.phase !== 'waiting') return;
      this.rooms.delete(s.id);
      this.emitListings();
      this.close('owner_left');
    },
    kickMe: () => {
      const s = this.session;
      if (!s || s.youAreOwner) return;
      this.removeFromRoom(s.id, this.me.id);
      this.close('kicked');
    },
    toggleFailNextLink: (): boolean => (this.failNextLink = !this.failNextLink),
    toggleLiveActivity: (): boolean => (this.liveActivity = !this.liveActivity),
    clearLobby: () => {
      for (const [id, room] of this.rooms) if (room.listing.owner.id !== this.me.id) this.rooms.delete(id);
      this.emitListings();
    },
    refillLobby: () => {
      this.seedRooms();
      this.emitListings();
    },
  };

  get failNextLinkEnabled(): boolean {
    return this.failNextLink;
  }
  get liveActivityEnabled(): boolean {
    return this.liveActivity;
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private seedRooms(): void {
    // A realistic lobby is a few dozen rooms, not hundreds.
    if (this.rooms.size >= MAX_ROOMS) return;
    const now = Date.now();
    const titles = [...SAMPLE_TITLES].sort(() => Math.random() - 0.5).slice(0, 8);
    titles.forEach((title, i) => {
      const owner = this.people[i % this.people.length] as Profile;
      const limit = pick([2, 3, 4] as const);
      const hasPassword = i % 3 === 1;
      // Keep every kind of card on screen: room 3 is always full, locked
      // rooms always have space so the password prompt can be tried.
      const memberCount =
        i === 3 ? limit : hasPassword ? 1 : Math.min(limit - 1, 1 + Math.floor(Math.random() * limit));
      const others = this.people.filter((p) => p.id !== owner.id).slice(i, i + memberCount - 1);
      const listing: RoomListing = {
        id: randomId().slice(0, 16),
        title,
        owner,
        memberCount: 1 + others.length,
        limit,
        hasPassword,
        visibility: i % 4 === 2 ? 'friends' : 'public',
        createdAt: now - (i * 4 + Math.floor(Math.random() * 4)) * 60_000,
      };
      this.rooms.set(listing.id, {
        listing,
        password: listing.hasPassword ? MOCK_PASSWORD : null,
        refusesYou: i === 5,
        members: [owner, ...others],
      });
    });
  }

  /** Small random changes so the lobby feels alive while designing. */
  private liveTick(): void {
    if (!this.liveActivity || this.directory !== 'online') return;
    const others = [...this.rooms.values()].filter((r) => r.listing.owner.id !== this.me.id);
    const roll = Math.random();
    if (roll < 0.35 && others.length > 3) {
      // A room fills up and starts, so it leaves the lobby.
      this.rooms.delete(pick(others).listing.id);
    } else if (roll < 0.7 && others.length < 12) {
      const owner = pick(this.people);
      const limit = pick([2, 3, 4] as const);
      const listing: RoomListing = {
        id: randomId().slice(0, 16),
        title: pick(SAMPLE_TITLES),
        owner,
        memberCount: 1,
        limit,
        hasPassword: Math.random() < 0.3,
        visibility: Math.random() < 0.25 ? 'friends' : 'public',
        createdAt: Date.now(),
      };
      this.rooms.set(listing.id, {
        listing,
        password: listing.hasPassword ? MOCK_PASSWORD : null,
        refusesYou: false,
        members: [owner],
      });
    } else if (others.length) {
      const room = pick(others);
      if (room.members.length < room.listing.limit) {
        room.members.push(pick(this.people));
        room.listing.memberCount = room.members.length;
      }
    }
    this.emitListings();
  }

  private beginDirectConnections(session: RoomSession): void {
    session.phase = 'connecting';
    for (const m of session.members) if (!m.isYou) m.link = 'connecting';
    this.emitSession();
    this.notice('info', 'Room started. Disconnected from the directory; connecting directly…');

    const others = session.members.filter((m) => !m.isYou);
    const failing = this.failNextLink ? others[others.length - 1] : undefined;
    this.failNextLink = false;
    let pending = others.length;

    for (const m of others) {
      this.later(600 + Math.random() * 1400, () => {
        if (this.session !== session) return;
        m.link = m === failing ? 'failed' : 'connected';
        if (m === failing) {
          this.notice(
            'warning',
            `Couldn't connect directly to ${m.profile.nickname}. Rooms never use a relay, so they can't join this session.`,
          );
        }
        this.emitSession();
        pending -= 1;
        if (pending === 0) this.finishConnecting(session);
      });
    }
  }

  private finishConnecting(session: RoomSession): void {
    session.members = session.members.filter((m) => m.link !== 'failed');
    if (session.members.length < 2) {
      this.close('everyone_left');
      return;
    }
    session.phase = 'started';
    this.emitSession();
    this.notice('success', 'Connected peer-to-peer. Nothing goes through the directory now.');
  }

  private close(reason: NonNullable<RoomSession['closedReason']>): void {
    if (!this.session) return;
    this.session.phase = 'closed';
    this.session.closedReason = reason;
    const closed = this.snapshot();
    this.session = null;
    this.emit({ type: 'session', session: closed });
  }

  private setDirectory(status: DirectoryStatus): void {
    this.directory = status;
    this.emit({ type: 'directory_status', status });
    if (status === 'online') this.emitListings();
    // A waiting room lives on the directory; a started room does not.
    if (status === 'offline' && this.session?.phase === 'waiting') this.close('directory_lost');
  }

  private member(profile: Profile, isOwner: boolean, isYou: boolean): RoomMember {
    return { profile: { ...profile }, isOwner, isYou, link: 'pending' };
  }

  private removeFromRoom(roomId: string, peerId: PeerId): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.members = room.members.filter((p) => p.id !== peerId);
    this.syncCount(roomId);
  }

  private syncCount(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) room.listing.memberCount = room.members.length;
    this.emitListings();
  }

  private publicListings(): RoomListing[] {
    if (this.directory !== 'online') return [];
    return [...this.rooms.values()]
      .map((r) => ({ ...r.listing, owner: { ...r.listing.owner } }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  private snapshot(): RoomSession {
    const s = this.session as RoomSession;
    return {
      ...s,
      members: s.members.map((m) => ({ ...m, profile: { ...m.profile } })),
      blocklist: [...s.blocklist],
    };
  }

  private requireOnline(): void {
    if (this.directory !== 'online') throw new CoreError('offline', "Can't reach the room directory.");
  }
  private requireNoSession(): void {
    if (this.session) throw new CoreError('invalid', 'Leave your current room first.');
  }
  private requireSession(): RoomSession {
    if (!this.session) throw new CoreError('no_session', "You're not in a room.");
    return this.session;
  }
  private requireOwner(): RoomSession {
    const s = this.requireSession();
    if (!s.youAreOwner) throw new CoreError('not_owner', 'Only the room owner can do that.');
    return s;
  }

  private emitListings(): void {
    this.emit({ type: 'listings', rooms: this.publicListings() });
  }
  private emitSession(): void {
    if (this.session) this.emit({ type: 'session', session: this.snapshot() });
  }
  private notice(level: 'info' | 'success' | 'warning' | 'error', text: string): void {
    this.emit({ type: 'notice', level, text });
  }
  private emit(event: CoreEvent): void {
    for (const listener of this.listeners) listener(event);
  }
  private later(ms: number, fn: () => void): void {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, ms);
    this.timers.add(t);
  }
}
