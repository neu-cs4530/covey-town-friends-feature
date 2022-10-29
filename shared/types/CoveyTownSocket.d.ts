import { Player as PlayerSrc } from "covey-town-townService/src/lib/Player";

export type TownJoinResponse = {
  /** Unique ID that represents this player * */
  userID: string;
  /** Secret token that this player should use to authenticate
   * in future requests to this service * */
  sessionToken: string;
  /** Secret token that this player should use to authenticate
   * in future requests to the video service * */
  providerVideoToken: string;
  /** List of players currently in this town * */
  currentPlayers: Player[];
  /** Friendly name of this town * */
  friendlyName: string;
  /** Is this a private town? * */
  isPubliclyListed: boolean;
  /** Current state of interactables in this town */
  interactables: Interactable[];
}

export type Interactable = ViewingArea | ConversationArea;

export type TownSettingsUpdate = {
  friendlyName?: string;
  isPubliclyListed?: boolean;
}

export type Direction = 'front' | 'back' | 'left' | 'right';
export interface Player {
  id: string;
  userName: string;
  location: PlayerLocation;
};

export type XY = { x: number, y: number };

export interface PlayerLocation {
  /* The CENTER x coordinate of this player's location */
  x: number;
  /* The CENTER y coordinate of this player's location */
  y: number;
  /** @enum {string} */
  rotation: Direction;
  moving: boolean;
  interactableID?: string;
};
export type ChatMessage = {
  author: string;
  sid: string;
  body: string;
  dateCreated: Date;
};

export interface ConversationArea {
  id: string;
  topic?: string;
  occupantsByID: string[];
};
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface ViewingArea {
  id: string;
  video?: string;
  isPlaying: boolean;
  elapsedTimeSec: number;
}

export type PlayerToPlayerUpdate = {
  actor: PlayerSrc;
  affected: PlayerSrc;
};

export type ConversationAreaInvite = {
  requester: PlayerSrc;
  requested: PlayerSrc[];
  // Check whether this is a shallow/deep copy, potentially remove player location
  requesterLocation: PlayerLocation;
};

export type TeleportInviteSingular = {
  requester: PlayerSrc;
  requested: PlayerSrc;
  requesterLocation: PlayerLocation;
};

export interface ServerToClientEvents {
  playerMoved: (movedPlayer: Player) => void;
  playerDisconnect: (disconnectedPlayer: Player) => void;
  playerJoined: (newPlayer: Player) => void;
  initialize: (initialData: TownJoinResponse) => void;
  townSettingsUpdated: (update: TownSettingsUpdate) => void;
  townClosing: () => void;
  chatMessage: (message: ChatMessage) => void;
  interactableUpdate: (interactable: Interactable) => void;
  // actor is sender, affected is recipient
  friendRequestSent: (friendRequest: PlayerToPlayerUpdate) => void;
  // actor is accepter, affected is the initial sender of the request
  friendRequestAccepted: (friendRequest: PlayerToPlayerUpdate) => void;
  // actor is decliner, affected is the initial sender of the request
  friendRequestDeclined: (friendRequest: PlayerToPlayerUpdate) => void;
  // actor is remover, affected is the removed friend
  friendRemoved: (friendRequest: PlayerToPlayerUpdate) => void;
  conversationAreaRequestSent: (
    conversationAreaInviteRequest: ConversationAreaInvite
  ) => void;
  conversationAreaRequestAccepted: (
    conversationAreaInviteRequest: TeleportInviteSingular
  ) => void;
  conversationAreaRequestDeclined: (
    conversationAreaInviteRequest: TeleportInviteSingular
  ) => void;
}
export interface ClientToServerEvents {
  chatMessage: (message: ChatMessage) => void;
  playerMovement: (movementData: PlayerLocation) => void;
  interactableUpdate: (update: Interactable) => void;
  // actor is the Player who clicked accept 
  acceptFriendRequest(friendRequest: PlayerToPlayerUpdate);
  // actor is the Player who clicked decline
  declineFriendRequest(friendRequest: PlayerToPlayerUpdate);
}