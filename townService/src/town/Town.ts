import { ITiledMap, ITiledMapObjectLayer } from '@jonbell/tiled-map-type-guard';
import { nanoid } from 'nanoid';
import { BroadcastOperator } from 'socket.io';
import IVideoClient from '../lib/IVideoClient';
import Player from '../lib/Player';
import TwilioVideo from '../lib/TwilioVideo';
import { isViewingArea } from '../TestUtils';
import {
  ChatMessage,
  ConversationArea as ConversationAreaModel,
  CoveyTownSocket,
  Interactable,
  PlayerLocation,
  ServerToClientEvents,
  SocketData,
  ViewingArea as ViewingAreaModel,
  ConversationAreaGroupInvite,
  TeleportInviteSingular,
  PlayerToPlayerUpdate,
  BriefMessage,
} from '../types/CoveyTownSocket';
import ConversationArea from './ConversationArea';
import InteractableArea from './InteractableArea';
import ViewingArea from './ViewingArea';

/**
 * The Town class implements the logic for each town: managing the various events that
 * can occur (e.g. joining a town, moving, leaving a town).
 */
export default class Town {
  get capacity(): number {
    return this._capacity;
  }

  set isPubliclyListed(value: boolean) {
    this._isPubliclyListed = value;
    this._broadcastEmitter.emit('townSettingsUpdated', { isPubliclyListed: value });
  }

  get isPubliclyListed(): boolean {
    return this._isPubliclyListed;
  }

  get townUpdatePassword(): string {
    return this._townUpdatePassword;
  }

  get players(): Player[] {
    return this._players;
  }

  get occupancy(): number {
    return this.players.length;
  }

  get friendlyName(): string {
    return this._friendlyName;
  }

  set friendlyName(value: string) {
    this._friendlyName = value;
    this._broadcastEmitter.emit('townSettingsUpdated', { friendlyName: value });
  }

  get townID(): string {
    return this._townID;
  }

  get interactables(): InteractableArea[] {
    return this._interactables;
  }

  /** The list of players currently in the town * */
  private _players: Player[] = [];

  /** The videoClient that this CoveyTown will use to provision video resources * */
  private _videoClient: IVideoClient = TwilioVideo.getInstance();

  private _interactables: InteractableArea[] = [];

  private readonly _townID: string;

  private _friendlyName: string;

  private readonly _townUpdatePassword: string;

  private _isPubliclyListed: boolean;

  private _capacity: number;

  private _broadcastEmitter: BroadcastOperator<ServerToClientEvents, SocketData>;

  private _connectedSockets: Set<CoveyTownSocket> = new Set();

  constructor(
    friendlyName: string,
    isPubliclyListed: boolean,
    townID: string,
    broadcastEmitter: BroadcastOperator<ServerToClientEvents, SocketData>,
  ) {
    this._townID = townID;
    this._capacity = 50;
    this._townUpdatePassword = nanoid(24);
    this._isPubliclyListed = isPubliclyListed;
    this._friendlyName = friendlyName;
    this._broadcastEmitter = broadcastEmitter;
  }

  /**
   * Adds a player to this Covey Town, provisioning the necessary credentials for the
   * player, and returning them.
   *
   * @param newPlayer The new player to add to the town
   */
  async addPlayer(userName: string, socket: CoveyTownSocket): Promise<Player> {
    const newPlayer = new Player(userName, socket.to(this._townID));
    this._players.push(newPlayer);

    this._connectedSockets.add(socket);

    // Create a video token for this user to join this town
    newPlayer.videoToken = await this._videoClient.getTokenForTown(this._townID, newPlayer.id);

    // Notify other players that this player has joined
    this._broadcastEmitter.emit('playerJoined', newPlayer.toPlayerModel());

    // Register an event listener for the client socket: if the client disconnects,
    // clean up our listener adapter, and then let the CoveyTownController know that the
    // player's session is disconnected
    socket.on('disconnect', () => {
      this._removePlayer(newPlayer);
      this._connectedSockets.delete(socket);
    });

    // Set up a listener to forward all chat messages to all clients in the town
    socket.on('chatMessage', (message: ChatMessage) => {
      this._broadcastEmitter.emit('chatMessage', message);
    });

    // Register an event listener for the client socket: if the client updates their
    // location, inform the CoveyTownController
    socket.on('playerMovement', (movementData: PlayerLocation) => {
      this._updatePlayerLocation(newPlayer, movementData);
    });

    // Set up a listener to process updates to interactables.
    // Currently only knows how to process updates for ViewingArea's, and
    // ignores any other updates for any other kind of interactable.
    // For ViewingArea's: dispatches an updateModel call to the viewingArea that
    // corresponds to the interactable being updated. Does not throw an error if
    // the specified viewing area does not exist.
    socket.on('interactableUpdate', (update: Interactable) => {
      if (isViewingArea(update)) {
        newPlayer.townEmitter.emit('interactableUpdate', update);
        const viewingArea = this._interactables.find(
          eachInteractable => eachInteractable.id === update.id,
        );
        if (viewingArea) {
          (viewingArea as ViewingArea).updateModel(update);
        }
      }
    });

    // Set up a listener to process accepted friend requests.
    // Makes the necessary backend changes & then emits an event to let the TownController know
    // the changes have been made.
    socket.on('acceptFriendRequest', (friendRequest: PlayerToPlayerUpdate) => {
      this.acceptFriendRequest(friendRequest);
    });

    // Set up a listener to process declined friend request.
    // Makes the necessary backend changes & then emits an event to let the TownController know
    // the changes have been made.
    socket.on('declineFriendRequest', (friendRequest: PlayerToPlayerUpdate) => {
      this.declineFriendRequest(friendRequest);
    });

    // Set up a listener to process declined friend request.
    // Makes the necessary backend changes & then emits an event to let the TownController know
    // the changes have been made.
    socket.on('sendFriendRequest', (friendRequest: PlayerToPlayerUpdate) => {
      // emits a friend request event which IS sending the friendrequest
      this.inviteFriend(friendRequest);
    });

    // Set up a listener to process declined friend request.
    // Makes the necessary backend changes & then emits an event to let the TownController know
    // the changes have been made.
    socket.on('cancelFriendRequest', (friendRequest: PlayerToPlayerUpdate) => {
      // emits a friend request event which will remove the request
      this.cancelFriendRequest(friendRequest);
    });

    // Set up a listener to process the remove friend request.
    // Makes the necessary backend changes & then emits an event to let the TownController
    // know the changes have been made.
    socket.on('removeFriend', (removeFriend: PlayerToPlayerUpdate) => {
      this.removeFriend(removeFriend);
    });

    // Set up a listener to process the conversation area teleport request.
    // Makes the necessary backend changes & then emits an event to let the TownController
    // know the changes have been made.
    socket.on('inviteAllToConvArea', (invite: ConversationAreaGroupInvite) => {
      this.inviteToConversationArea(invite);
    });

    // Set up a listener to process accepted conv area invites.
    // Makes the necessary backend changes & then emits an event to let the TownController know
    // the changes have been made.
    socket.on('acceptConvAreaInvite', (convAreaInvite: TeleportInviteSingular) => {
      this.acceptConversationAreaInvite(convAreaInvite);
    });

    // Set up a listener to process declined conv area invites.
    // Makes the necessary backend changes & then emits an event to let the TownController know
    // the changes have been made.
    socket.on('declineConvAreaInvite', (convAreaInvite: TeleportInviteSingular) => {
      this.declineConversationAreaInvite(convAreaInvite);
    });

    // Set up a listener to forward all brief messages to all clients in the town.
    socket.on('briefMessage', (briefMessage: BriefMessage) => {
      this._broadcastEmitter.emit('briefMessage', briefMessage);
    });

    return newPlayer;
  }

  /**
   * Destroys all data related to a player in this town.
   *
   * @param session PlayerSession to destroy
   */
  private _removePlayer(player: Player): void {
    this._players = this._players.filter(p => p.id !== player.id);
    this._broadcastEmitter.emit('playerDisconnect', player.toPlayerModel());
    if (player.location.interactableID) {
      this._removePlayerFromInteractable(player);
    }
  }

  /**
   * Emit a friendRequestSent event with the given sender and recipient.
   *
   * @param currentFriendRequest contains Player who is requesting another player to be
   *                             their friend and Player who is the intended recipient
   *                             of the friend request.
   */
  public inviteFriend(currentFriendRequest: PlayerToPlayerUpdate): void {
    // This should be caught by TownController
    this._broadcastEmitter.emit('friendRequestSent', currentFriendRequest);
  }

  /**
   * Emit a canceledFriendRequest event with the given sender and recipient.
   *
   * @param currentFriendRequest contains the Player who is canceling a request that
   *                             THEY sent to another player and Player who is the
   *                             intended recipient of the original friend request that
   *                             is being canceled.
   */
  public cancelFriendRequest(currentFriendRequest: PlayerToPlayerUpdate): void {
    // This should be caught by TownController
    this._broadcastEmitter.emit('friendRequestCanceled', currentFriendRequest);
  }

  /**
   * Emit a friendRequestAccepted event with the given acceptor and accepted. Adds each player to other
   * player's friends list.
   *
   * @param currentFriendRequest contains the recipient of the initial friend request
   *                             who Is ACCEPTING the received friend request and the
   *                             sender of the initial request.
   */
  public acceptFriendRequest(currentFriendRequest: PlayerToPlayerUpdate): void {
    currentFriendRequest.actor.addFriend(currentFriendRequest.affected);
    currentFriendRequest.affected.addFriend(currentFriendRequest.actor);
    this._broadcastEmitter.emit('friendRequestAccepted', currentFriendRequest);
  }

  /**
   * Emit a friendRemoved event with the given remover and removed.
   * Removes each player from each other's friends list.
   *
   * @param currentFriends containts the player removing the affected from their friend's
   *                       list and the player to be removed from the instigator's friends
   *                       list.
   */
  public removeFriend(currentFriends: PlayerToPlayerUpdate): void {
    currentFriends.actor.removeFriend(currentFriends.affected);
    currentFriends.affected.removeFriend(currentFriends.actor);
    this._broadcastEmitter.emit('friendRemoved', currentFriends);
  }

  /**
   * Emit a friendRequestDeclined event with the given decliner and declined. Does not
   * add each player to other player's friends list.
   *
   * @param currentRequest contains the recipient of the initial friend request and
   *                       the sender of the initial friend request.
   */
  public declineFriendRequest(currentRequest: PlayerToPlayerUpdate): void {
    // This should be caught by TownController
    this._broadcastEmitter.emit('friendRequestDeclined', currentRequest);
  }

  /**
   * Modifies a player's location to match the given destination player's location.
   * Assumes that UI enforces teleportation only between friends.
   *
   * @param teleportInvite the invite representing the teleportation information:
   * the player to teleport to, the player doing the teleporting, and the teleport location.
   */
  public teleportToFriend(teleportInvite: TeleportInviteSingular): void {
    const { requester, requested, requesterLocation } = teleportInvite;
    if (this._players.includes(requester)) {
      this._updatePlayerLocation(requested, requesterLocation);
    }
  }

  /**
   * Invites the given list of friends to the instigator's location within a ConversationArea.
   *
   * @param instigator the player sending out the invites.
   * @param invitedFriends the players invited.
   */
  public inviteToConversationArea(invite: ConversationAreaGroupInvite): void {
    // For each requested player, add the corresponding teleport request to their invite list.
    invite.requested.forEach(friend => {
      const inviteToOne: TeleportInviteSingular = {
        requester: invite.requester,
        requested: friend,
        requesterLocation: invite.requesterLocation,
      };
      if (
        // check to make sure that there is not already an invite from this player to this specific location
        // before adding it to the conversation area invite list.
        !friend.conversationAreaInvites.find(
          (convInvite: TeleportInviteSingular) =>
            convInvite.requesterLocation === invite.requesterLocation &&
            convInvite.requester === invite.requester,
        )
      ) {
        friend.addConversationAreaInvite(inviteToOne);
      }
    });
    this._broadcastEmitter.emit('conversationAreaRequestSent', invite);
  }

  /**
   * Accepts the instigator's invite to join a ConversationArea and sends
   * the acceptor to the instigator's location. Removes the corresponding invite
   * request from the list.
   *
   * @param teleportInvite the teleport invite request that is being accepted
   */
  public acceptConversationAreaInvite(teleportInvite: TeleportInviteSingular): void {
    const { requested } = teleportInvite;
    requested.removeConversationAreaInvite(teleportInvite);
    this.teleportToFriend(teleportInvite);
    this._broadcastEmitter.emit('conversationAreaRequestAccepted', teleportInvite);
  }

  /**
   * Declines the instigator's invite to join a ConversationArea.
   * Removes the invite from the decliner's list of invites.
   *
   * @param teleportInvite the teleport invite request that is being declined.
   */
  public declineConversationAreaInvite(declinedInvite: TeleportInviteSingular): void {
    declinedInvite.requested.removeConversationAreaInvite(declinedInvite);
    this._broadcastEmitter.emit('conversationAreaRequestDeclined', declinedInvite);
  }

  /**
   * Updates the location of a player within the town.
   *
   * If the player has changed conversation areas, this method also updates the
   * corresponding ConversationArea objects tracked by the town controller, and dispatches
   * any onConversationUpdated events as appropriate.
   *
   * @param player Player to update location for.
   * @param location New location for this player.
   */
  private _updatePlayerLocation(player: Player, location: PlayerLocation): void {
    const prevInteractable = this._interactables.find(
      conv => conv.id === player.location.interactableID,
    );

    if (!prevInteractable?.contains(location)) {
      if (prevInteractable) {
        // Remove from old area
        prevInteractable.remove(player);
      }
      const newInteractable = this._interactables.find(
        eachArea => eachArea.isActive && eachArea.contains(location),
      );
      if (newInteractable) {
        newInteractable.add(player);
      }
      location.interactableID = newInteractable?.id;
    } else {
      location.interactableID = prevInteractable.id;
    }

    player.location = location;

    this._broadcastEmitter.emit('playerMoved', player.toPlayerModel());
  }

  /**
   * Removes a player from a conversation area, updating the conversation area's occupants list,
   * and emitting the appropriate message (area updated or area destroyed).
   *
   * @param player Player to remove from their current conversation area.
   */
  private _removePlayerFromInteractable(player: Player): void {
    const area = this._interactables.find(
      eachArea => eachArea.id === player.location.interactableID,
    );
    if (area) {
      area.remove(player);
    }
  }

  /**
   * Creates a new conversation area in this town if there is not currently an active
   * conversation with the same ID. The conversation area ID must match the name of a
   * conversation area that exists in this town's map, and the conversation area must not
   * already have a topic set.
   *
   * If successful creating the conversation area, this method:
   *  Adds any players who are in the region defined by the conversation area to it.
   *  Notifies all players in the town that the conversation area has been updated.
   *
   * @param conversationArea Information describing the conversation area to create. Ignores any
   *  occupantsById that are set on the conversation area that is passed to this method.
   *
   * @returns true if the conversation is successfully created, or false if there is no known
   * conversation area with the specified ID or if there is already an active conversation area
   * with the specified ID.
   */
  public addConversationArea(conversationArea: ConversationAreaModel): boolean {
    const area = this._interactables.find(
      eachArea => eachArea.id === conversationArea.id,
    ) as ConversationArea;
    if (!area || !conversationArea.topic || area.topic) {
      return false;
    }
    area.topic = conversationArea.topic;
    area.addPlayersWithinBounds(this._players);
    this._broadcastEmitter.emit('interactableUpdate', area.toModel());
    return true;
  }

  /**
   * Creates a new viewing area in this town if there is not currently an active
   * viewing area with the same ID. The viewing area ID must match the name of a
   * viewing area that exists in this town's map, and the viewing area must not
   * already have a video set.
   *
   * If successful creating the viewing area, this method:
   *    Adds any players who are in the region defined by the viewing area to it
   *    Notifies all players in the town that the viewing area has been updated by
   *      emitting an interactableUpdate event.
   *
   * @param viewingArea Information describing the viewing area to create.
   *
   * @returns True if the viewing area was created or false if there is no known
   * viewing area with the specified ID or if there is already an active viewing area
   * with the specified ID or if there is no video URL specified
   */
  public addViewingArea(viewingArea: ViewingAreaModel): boolean {
    const area = this._interactables.find(
      eachArea => eachArea.id === viewingArea.id,
    ) as ViewingArea;
    if (!area || !viewingArea.video || area.video) {
      return false;
    }
    area.updateModel(viewingArea);
    area.addPlayersWithinBounds(this._players);
    this._broadcastEmitter.emit('interactableUpdate', area.toModel());
    return true;
  }

  /**
   * Fetch a player's session based on the provided session token. Returns undefined if the
   * session token is not valid.
   *
   * @param token
   */
  public getPlayerBySessionToken(token: string): Player | undefined {
    return this.players.find(eachPlayer => eachPlayer.sessionToken === token);
  }

  /**
   * Find an interactable by its ID.
   *
   * @param id
   * @returns the interactable
   * @throws Error if no such interactable exists
   */
  public getInteractable(id: string): InteractableArea {
    const ret = this._interactables.find(eachInteractable => eachInteractable.id === id);
    if (!ret) {
      throw new Error(`No such interactable ${id}`);
    }
    return ret;
  }

  /**
   * Informs all players' clients that they are about to be disconnected, and then
   * disconnects all players.
   */
  public disconnectAllPlayers(): void {
    this._broadcastEmitter.emit('townClosing');
    this._connectedSockets.forEach(eachSocket => eachSocket.disconnect(true));
  }

  /**
   * Initializes the town's state from a JSON map, setting the "interactables" property of this town
   * to instances of InteractableArea that match each interactable in the map.
   *
   * Each tilemap may contain "objects", and those objects may have properties. Towns
   * support two kinds of interactable objects: "ViewingArea" and "ConversationArea."
   * Initializing the town state from the map, then, means instantiating the corresponding objects.
   *
   * This method will throw an Error if the objects are not valid:
   * In the map file, each object is identified with a name. Names must be unique. Each object also has
   * some kind of geometry that establishes where the object is on the map. Objects must not overlap.
   *
   * @param mapFile the map file to read in, defaults to the "indoors" map in the frontend
   * @throws Error if there is no layer named "Objects" in the map, if the objects overlap or if object
   *  names are not unique
   */
  public initializeFromMap(map: ITiledMap) {
    const objectLayer = map.layers.find(
      eachLayer => eachLayer.name === 'Objects',
    ) as ITiledMapObjectLayer;
    if (!objectLayer) {
      throw new Error(`Unable to find objects layer in map`);
    }
    const viewingAreas = objectLayer.objects
      .filter(eachObject => eachObject.type === 'ViewingArea')
      .map(eachViewingAreaObject =>
        ViewingArea.fromMapObject(eachViewingAreaObject, this._broadcastEmitter),
      );

    const conversationAreas = objectLayer.objects
      .filter(eachObject => eachObject.type === 'ConversationArea')
      .map(eachConvAreaObj =>
        ConversationArea.fromMapObject(eachConvAreaObj, this._broadcastEmitter),
      );

    this._interactables = this._interactables.concat(viewingAreas).concat(conversationAreas);
    this._validateInteractables();
  }

  private _validateInteractables() {
    // Make sure that the IDs are unique
    const interactableIDs = this._interactables.map(eachInteractable => eachInteractable.id);
    if (
      interactableIDs.some(
        item => interactableIDs.indexOf(item) !== interactableIDs.lastIndexOf(item),
      )
    ) {
      throw new Error(
        `Expected all interactable IDs to be unique, but found duplicate interactable ID in ${interactableIDs}`,
      );
    }
    // Make sure that there are no overlapping objects
    for (const interactable of this._interactables) {
      for (const otherInteractable of this._interactables) {
        if (interactable !== otherInteractable && interactable.overlaps(otherInteractable)) {
          throw new Error(
            `Expected interactables not to overlap, but found overlap between ${interactable.id} and ${otherInteractable.id}`,
          );
        }
      }
    }
  }
}
