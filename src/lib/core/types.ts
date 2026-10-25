// The contract between the UI and the backend.
//
// The UI only ever talks to the backend through the `Core` interface below.
// Today it is implemented by a fake (mock.ts). Later the Rust backend will
// implement exactly the same interface, so the UI does not change.

/** Hex-encoded public key. This is a person's real, permanent identity. */
export type PeerId = string;

/** What other people see about someone. Nickname is only a label. */
export interface Profile {
  id: PeerId;
  nickname: string;
  /** Short code derived from the key, e.g. "7F3K". Cannot be chosen or faked. */
  tag: string;
}

export type Visibility = 'public' | 'friends';
export type PeerLimit = 2 | 3 | 4;

/** A room waiting to start, as shown in the Rooms lobby. */
export interface RoomListing {
  id: string;
  title: string;
  owner: Profile;
  memberCount: number;
  limit: PeerLimit;
  hasPassword: boolean;
  visibility: Visibility;
  /** Milliseconds since epoch. */
  createdAt: number;
}

/** Connection to the room directory (the only thing on the domain). */
export type DirectoryStatus = 'connecting' | 'online' | 'offline';

export interface CreateRoomOptions {
  title: string;
  /** null means no password. Never sent to the directory. */
  password: string | null;
  visibility: Visibility;
  limit: PeerLimit;
  /** Identities refused at the door. Stored only on the owner's PC. */
  blocklist: PeerId[];
}

/**
 * waiting    – listed in the lobby, people can join, owner can kick
 * connecting – owner pressed Start; delisted; peers connecting directly
 * started    – everyone is connected peer-to-peer; the directory is gone
 * closed     – the room ended (see closedReason)
 */
export type RoomPhase = 'waiting' | 'connecting' | 'started' | 'closed';

/** Direct P2P link to one other member, once the room starts. */
export type PeerLinkState = 'pending' | 'connecting' | 'connected' | 'failed';

export interface RoomMember {
  profile: Profile;
  isOwner: boolean;
  isYou: boolean;
  link: PeerLinkState;
}

export type CloseReason =
  | 'you_left'
  | 'owner_left'
  | 'kicked'
  | 'directory_lost'
  | 'everyone_left';

export interface RoomSession {
  id: string;
  title: string;
  limit: PeerLimit;
  hasPassword: boolean;
  visibility: Visibility;
  phase: RoomPhase;
  members: RoomMember[];
  youAreOwner: boolean;
  /** Only filled in for the owner. */
  blocklist: PeerId[];
  closedReason: CloseReason | null;
}

/** Why joining a room failed. "refused" covers the blocklist on purpose:
 *  a blocked person is not told they are blocked. */
export type JoinErrorCode =
  | 'wrong_password'
  | 'full'
  | 'refused'
  | 'closed'
  | 'started'
  | 'offline';

export class CoreError extends Error {
  constructor(
    readonly code: JoinErrorCode | 'invalid' | 'not_owner' | 'no_session',
    message: string,
  ) {
    super(message);
  }
}

export type NoticeLevel = 'info' | 'success' | 'warning' | 'error';

/** Things the backend tells the UI without being asked. */
export type CoreEvent =
  | { type: 'identity'; identity: Profile }
  | { type: 'directory_status'; status: DirectoryStatus }
  | { type: 'listings'; rooms: RoomListing[] }
  | { type: 'session'; session: RoomSession | null }
  | { type: 'notice'; level: NoticeLevel; text: string };

export interface Core {
  /** Your own identity. Created on first launch. */
  identity(): Promise<Profile>;
  /** Changes only the label; the identity stays the same. */
  setNickname(nickname: string): Promise<Profile>;
  /** People you have been in rooms with; used to build blocklists. */
  knownPeers(): Promise<Profile[]>;

  /** Try reaching the room directory again after it went offline. */
  reconnectDirectory(): Promise<void>;

  createRoom(options: CreateRoomOptions): Promise<RoomSession>;
  joinRoom(roomId: string, password: string | null): Promise<RoomSession>;
  leaveRoom(): Promise<void>;

  /** Owner only. */
  kick(peerId: PeerId): Promise<void>;
  /** Owner only. Delists the room and switches everyone to direct P2P. */
  startRoom(): Promise<void>;
  /** Owner only. */
  setBlocklist(peerIds: PeerId[]): Promise<void>;

  /** Receive events. Returns a function that stops listening. */
  subscribe(listener: (event: CoreEvent) => void): () => void;
}

export const NICKNAME_MAX = 32;
export const ROOM_TITLE_MAX = 48;
export const PASSWORD_MAX = 128;
