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
};

export type Interactable = ViewingArea | ConversationArea;

export type TownSettingsUpdate = {
  friendlyName?: string;
  isPubliclyListed?: boolean;
};

export type Direction = "front" | "back" | "left" | "right";
export interface Player {
  id: string;
  userName: string;
  location: PlayerLocation;
}

export type XY = { x: number; y: number };

export interface PlayerLocation {
  /* The CENTER x coordinate of this player's location */
  x: number;
  /* The CENTER y coordinate of this player's location */
  y: number;
  /** @enum {string} */
  rotation: Direction;
  moving: boolean;
  interactableID?: string;
}
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
}
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewingArea {
  id: string;
  video?: string;
  isPlaying: boolean;
  elapsedTimeSec: number;
}

// actor and affected are the IDs of players
export type PlayerToPlayerUpdate = {
  actor: string;
  affected: string;
};

// requester and requested are the IDs of players
export type ConversationAreaGroupInvite = {
  requester: string;
  requested: string[];
  // Check whether this is a shallow/deep copy, potentially remove player location
  requesterLocation: PlayerLocation;
};

// requester and requested are the IDs of players
export type TeleportInviteSingular = {
  requester: string;
  requested: string;
  requesterLocation: PlayerLocation;
};

// sender and recipients are the IDs of players
export type MiniMessage = {
  sender: string;
  recipients: string[];
  body: string;
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
  // actor is sender / canceler, affected is original recipient
  friendRequestCanceled: (friendRequest: PlayerToPlayerUpdate) => void;
  // actor is accepter, affected is the initial sender of the request
  friendRequestAccepted: (friendRequest: PlayerToPlayerUpdate) => void;
  // actor is decliner, affected is the initial sender of the request
  friendRequestDeclined: (friendRequest: PlayerToPlayerUpdate) => void;
  // actor is remover, affected is the removed friend
  friendRemoved: (friendRequest: PlayerToPlayerUpdate) => void;
  conversationAreaRequestSent: (
    conversationAreaInviteRequest: ConversationAreaGroupInvite
  ) => void;
  conversationAreaRequestAccepted: (
    conversationAreaInviteRequest: TeleportInviteSingular
  ) => void;
  conversationAreaRequestDeclined: (
    conversationAreaInviteRequest: TeleportInviteSingular
  ) => void;
  // sender is the Player who sent the message to their currently selected friends
  miniMessageSent: (miniMessage: MiniMessage) => void;
}
export interface ClientToServerEvents {
  chatMessage: (message: ChatMessage) => void;
  playerMovement: (movementData: PlayerLocation) => void;
  interactableUpdate: (update: Interactable) => void;
  // actor is the Player who clicked accept
  acceptFriendRequest(friendRequest: PlayerToPlayerUpdate);
  // actor is the Player who clicked decline
  declineFriendRequest(friendRequest: PlayerToPlayerUpdate);
  // actor is sender, affected is recipient
  sendFriendRequest: (friendRequest: PlayerToPlayerUpdate) => void;
  // actor is sender / canceler, affected is original recipient
  cancelFriendRequest: (friendRequest: PlayerToPlayerUpdate) => void;
  // actor is the Player who clicked remove friend
  removeFriend(removeFriend: PlayerToPlayerUpdate);
  // requester is the Player who clicked to invite selected friends
  inviteAllToConvArea(invite: ConversationAreaGroupInvite);
  // requester is the Player who originally sent the invite
  acceptConvAreaInvite(convAreaInvite: TeleportInviteSingular);
  // requester is the Player who originally sent the invite
  declineConvAreaInvite(convAreaInvite: TeleportInviteSingular);
  // sender is the Player who sent the message to their currently selected friends
  sendMiniMessage: (miniMessage: MiniMessage) => void;
}
