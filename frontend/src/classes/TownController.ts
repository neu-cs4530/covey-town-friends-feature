import assert from 'assert';
import EventEmitter from 'events';
import _ from 'lodash';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import TypedEmitter from 'typed-emitter';
import Interactable from '../components/Town/Interactable';
import ViewingArea from '../components/Town/interactables/ViewingArea';
import { LoginController } from '../contexts/LoginControllerContext';
import { TownsService, TownsServiceClient } from '../generated/client';
import useTownController from '../hooks/useTownController';
import {
  ChatMessage,
  CoveyTownSocket,
  PlayerLocation,
  PlayerToPlayerUpdate,
  TeleportInviteSingular,
  TownSettingsUpdate,
  ViewingArea as ViewingAreaModel,
  ConversationAreaGroupInvite,
  MiniMessage,
} from '../types/CoveyTownSocket';
import { isConversationArea, isViewingArea } from '../types/TypeUtils';
import ConversationAreaController from './ConversationAreaController';
import PlayerController from './PlayerController';
import ViewingAreaController from './ViewingAreaController';

const CALCULATE_NEARBY_PLAYERS_DELAY = 300;

export type ConnectionProperties = {
  userName: string;
  townID: string;
  loginController: LoginController;
};

/**
 * The TownController emits these events. Components may subscribe to these events
 * by calling the `addListener` method on a TownController
 */
export type TownEvents = {
  /**
   * An event that indicates that the TownController is now connected to the townService
   * @param providerVideoToken a secret token that can be used to connect to the video service
   */
  connect: (providerVideoToken: string) => void;

  /**
   * An event that indicates that the TownController has been disconnected from the townService
   */
  disconnect: () => void;

  /**
   * An event that indicates that the town settings have been updated. This event is dispatched
   * before updating the properties of this TownController; clients may find the new settings in the parameter
   */
  townSettingsUpdated: (newTownSettings: TownSettingsUpdate) => void;

  /**
   * An event that indicates that the set of players in the town has changed. This event is dispatched
   * before updating the proeprties of this TownController; clients will find the new players in the parameter
   */
  playersChanged: (newPlayers: PlayerController[]) => void;

  /**
   * An event that indicates that a player has moved. This event is dispatched after updating the player's location -
   * the new location can be found on the PlayerController.
   */
  playerMoved: (movedPlayer: PlayerController) => void;

  /**
   * An event that indicates that the set of conversation area requests has changed. This event is
   * dispatched when a request is added to the list, or removed - i.e., after updating this town
   * controller's record of conversation area requests.
   */
  conversationAreaInvitesChanged: (currentConvAreaInvites: TeleportInviteSingular[]) => void;

  /**
   * An event that indicates that the set of friend requests for this player has changed. This event
   * is dispatched when a request is added to the list (sent), or removed (accepted/declined).
   */
  playerFriendRequestsChanged: (currentPlayerFriendRequests: PlayerToPlayerUpdate[]) => void;

  /**
   * An event that indicates that the set of conversation areas has changed. This event is dispatched
   * when a conversation area is created, or when the set of active conversations has changed. This event is dispatched
   * after updating the town controller's record of conversation areas.
   */
  conversationAreasChanged: (currentConversationAreas: ConversationAreaController[]) => void;

  /**
   * An event that indicates that the set of TownController.ourPlayer's friends have changed. This event is
   * dispatched when a player accepts a friend request that has been sent to them, a player has accepted
   * one of this players requests, or if this player choses to remove a friend from their friends list.
   * This event is dispatched after updating the town controller's record of TownController.ourPlayer's friends.
   */
  playerFriendsChanged: (currentPlayerFriends: PlayerController[]) => void;

  /**
   * An event that indicates that the set of selected friends have changed. This event is
   * dispatched when a player selects or deselects a friend in the UI.
   * This event is dispatched after updating the town controller's record of TownController.selectedFriends.
   */
  selectedFriendsChanged: (selectedFriends: PlayerController[]) => void;

  /**
   * An event that indicates that this player has received a new MiniMessage. This event
   * is dispatched to trigger the display of the new message.
   */
  newMiniMessageReceived: (latestMiniMessage: MiniMessage) => void;

  /**
   * An event that indicates that the set of viewing areas has changed. This event is emitted after updating
   * the town controller's record of viewing areas.
   */
  viewingAreasChanged: (newViewingAreas: ViewingAreaController[]) => void;

  /**
   * An event that indicates that a new chat message has been received, which is the parameter passed to the listener
   */
  chatMessage: (message: ChatMessage) => void;

  /**
   * An event that indicates that the 2D game is now paused. Pausing the game should, if nothing else,
   * release all key listeners, so that text entry is possible
   */
  pause: () => void;

  /**
   * An event that indicates that the 2D game should now be unpaused (resumed).
   */
  unPause: () => void;

  /**
   * An event that indicates that the player is now interacting with a different interactable
   * @param typeName the type of interactable
   * @param obj the interactable that is being interacted with
   */
  interact: <T extends Interactable>(typeName: T['name'], obj: T) => void;

  /**
   * An event that indicates that a new mini message has been sent, which is the parameter
   * passed to the listener. The message object contains the player who is sending the
   * message (sender), the list of selected friends meant to receive it (recipients),
   * and the message itself (body).
   */
  clickedSendMiniMessage: (miniMessage: MiniMessage) => void;

  /**
   * An event that indicates that one of the affected player's friend requests has been accepted.
   * The request object contains the Player who accepted (actor) and the Player whose friend
   * request was accepted (affected).
   */
  friendRequestAccepted: (acceptedRequest: PlayerToPlayerUpdate) => void;
};

/**
 * The (frontend) TownController manages the communication between the frontend
 * and the backend. When a player join a town, a new TownController is created,
 * and frontend components can register to receive events (@see CoveyTownEvents).
 *
 * To access the TownController from a React component, use the
 * useTownController hook (@see useTownController). While the town controller
 * can be directly used by React components, it is generally preferable to use the various hooks
 * defined in this file (e.g. @see usePlayers, @see useConversationAreas), which will automatically
 * subscribe to updates to their respective data, triggering the React component that consumes them
 * to re-render when the underlying data changes.
 *
 */
export default class TownController extends (EventEmitter as new () => TypedEmitter<TownEvents>) {
  /** The socket connection to the townsService. Messages emitted here
   * are received by the TownController in that service.
   */
  private _socket: CoveyTownSocket;

  /**
   * The REST API client to access the townsService
   */
  private _townsService: TownsService;

  /**
   * The login controller is used by the frontend application to manage logging in to a town,
   * and is also used to log out of a town.
   */
  private _loginController: LoginController;

  /**
   * The current list of players in the town. Adding or removing players might replace the array
   * with a new one; clients should take note not to retain stale references.
   */
  private _playersInternal: PlayerController[] = [];

  /**
   * The current list of friend requests that concerns TownController.ourPlayer. Includes
   * requests where the actor is TownController.ourPlayer, and where the affected is.
   * Adding or removing requests might replace the array with a new one; clients should take
   * note not to retain stale references.
   */
  private _playerFriendRequestsInternal: PlayerToPlayerUpdate[] = [];

  /**
   * The current list of conversation area requests in the town. Adding or removing requests might
   * replace the array with a new one; clients should take note not to retain stale references.
   */
  private _conversationAreaInvitesInternal: TeleportInviteSingular[] = [];

  /**
   * The current list of this TownController.ourPlayer's friends in this town. Adding or removing
   * friends will replace the array with a new one. clients should take note not to retain stale references.
   */
  private _playerFriendsInternal: PlayerController[] = [];

  /**
   * The current list of this TownController's selected friends in this town. Selected or deselecting
   * friends in the UI will replace this array with a new one. Clients should take note not to retain stale references.
   */
  private _selectedFriendsInternal: PlayerController[] = [];

  /**
   * The current list of conversation areas in the twon. Adding or removing conversation areas might
   * replace the array with a new one; clients should take note not to retain stale references.
   */
  private _conversationAreasInternal: ConversationAreaController[] = [];

  /**
   * The friendly name of the current town, set only once this TownController is connected to the townsService
   */
  private _friendlyNameInternal?: string;

  /**
   * The town ID of the current town, generated by the backend townsService and used to uniquely identify this town with the
   * server and other players
   */
  private readonly _townID: string;

  /**
   * If true, then this town's friendlyName and townID are included in the public listing of active towns.
   * Changes to this variable do not influence the behavior of the server, it must be changed through the townsService API client
   */
  private _townIsPubliclyListedInternal = false;

  /**
   * The username of the player whose browser created this TownController
   */
  private readonly _userName: string;

  /**
   * The user ID of the player whose browser created this TownController. The user ID is set by the backend townsService, and
   * is only available after the service is connected.
   */
  private _userID?: string;

  /**
   * A reference to the Player object that represents the player whose browser created this TownController.
   */
  private _ourPlayer?: PlayerController;

  /**
   * A secret token that is provided by the townsService when we connect, and is needed
   * for authenticating future API calls as being from the same user who created this TownController.
   */
  private _sessionToken?: string;

  /**
   * A secret token that is provided by the townsService when we connect, and can be used to connect
   * to a third-party video conferecing service.
   */
  private _providerVideoToken?: string;

  /**
   * A flag indicating whether the current 2D game is paused, or not. Pausing the game will prevent it from updating,
   * and will also release any key bindings, allowing all keys to be used for text entry or other purposes.
   */
  private _paused = false;

  /**
   * An event emitter that broadcasts interactable-specific events
   */
  private _interactableEmitter = new EventEmitter();

  private _viewingAreas: ViewingAreaController[] = [];

  public constructor({ userName, townID, loginController }: ConnectionProperties) {
    super();
    this._townID = townID;
    this._userName = userName;
    this._loginController = loginController;

    /*
        The event emitter will show a warning if more than this number of listeners are registered, as it
        may indicate a leak (listeners that should de-register not de-registering). The default is 10; we expect
        more than 10 listeners because each conversation area might be its own listener, and there are more than 10
        */
    this.setMaxListeners(30);

    const url = process.env.REACT_APP_TOWNS_SERVICE_URL;
    assert(url);
    this._socket = io(url, { auth: { userName, townID } });
    this._townsService = new TownsServiceClient({ BASE: url }).towns;
    this.registerSocketListeners();
  }

  public get sessionToken() {
    return this._sessionToken || '';
  }

  public get userID() {
    const id = this._userID;
    assert(id);
    return id;
  }

  public get townIsPubliclyListed() {
    return this._townIsPubliclyListedInternal;
  }

  private set _townIsPubliclyListed(newSetting: boolean) {
    this._townIsPubliclyListedInternal = newSetting;
    this.emit('townSettingsUpdated', { isPubliclyListed: newSetting });
  }

  public get providerVideoToken() {
    const token = this._providerVideoToken;
    assert(token);
    return token;
  }

  public get userName() {
    return this._userName;
  }

  public get friendlyName() {
    const friendlyName = this._friendlyNameInternal;
    assert(friendlyName);
    return friendlyName;
  }

  private set _friendlyName(newFriendlyName: string) {
    this._friendlyNameInternal = newFriendlyName;
    this.emit('townSettingsUpdated', { friendlyName: newFriendlyName });
  }

  public get paused() {
    return this._paused;
  }

  public get ourPlayer() {
    const ret = this._ourPlayer;
    assert(ret);
    return ret;
  }

  public get townID() {
    return this._townID;
  }

  public pause(): void {
    if (!this._paused) {
      this._paused = true;
      this.emit('pause');
    }
  }

  public unPause(): void {
    if (this._paused) {
      this._paused = false;
      this.emit('unPause');
    }
  }

  public get players(): PlayerController[] {
    return this._playersInternal;
  }

  public set players(newPlayers: PlayerController[]) {
    this.emit('playersChanged', newPlayers);
    this._playersInternal = newPlayers;
  }

  public get conversationAreas() {
    return this._conversationAreasInternal;
  }

  private set _conversationAreas(newConversationAreas: ConversationAreaController[]) {
    this._conversationAreasInternal = newConversationAreas;
    this.emit('conversationAreasChanged', newConversationAreas);
  }

  public get conversationAreaInvites() {
    return this._conversationAreaInvitesInternal;
  }

  public set conversationAreaInvites(newConversationAreaInvites: TeleportInviteSingular[]) {
    // Only update the list if the new list is not the same as the current one
    if (
      !(
        this._conversationAreaInvitesInternal.length === newConversationAreaInvites.length &&
        this._conversationAreaInvitesInternal.every(item =>
          newConversationAreaInvites.includes(item),
        ) &&
        newConversationAreaInvites.every(item =>
          this._conversationAreaInvitesInternal.includes(item),
        )
      )
    ) {
      this._conversationAreaInvitesInternal = newConversationAreaInvites;
      this.emit('conversationAreaInvitesChanged', newConversationAreaInvites);
    }
  }

  public get playerFriendRequests() {
    return this._playerFriendRequestsInternal;
  }

  public set playerFriendRequests(newPlayerFriendRequests: PlayerToPlayerUpdate[]) {
    // Only update the list if the new list is not the same as the current one
    if (
      !(
        this._playerFriendRequestsInternal.length === newPlayerFriendRequests.length &&
        this._playerFriendRequestsInternal.every(item => newPlayerFriendRequests.includes(item)) &&
        newPlayerFriendRequests.every(item => this._playerFriendRequestsInternal.includes(item))
      )
    ) {
      this._playerFriendRequestsInternal = newPlayerFriendRequests;
      this.emit('playerFriendRequestsChanged', newPlayerFriendRequests);
    }
  }

  public get playerFriends() {
    return this._playerFriendsInternal;
  }

  public set playerFriends(newPlayerFriends: PlayerController[]) {
    if (
      !(
        this._playerFriendsInternal.length === newPlayerFriends.length &&
        this._playerFriendsInternal.every(friend => newPlayerFriends.includes(friend)) &&
        newPlayerFriends.every(friend => this._playerFriendsInternal.includes(friend))
      )
    ) {
      this._playerFriendsInternal = newPlayerFriends;
      this.emit('playerFriendsChanged', newPlayerFriends);
    }
  }

  public get selectedFriends() {
    return this._selectedFriendsInternal;
  }

  public set selectedFriends(newSelectedFriends: PlayerController[]) {
    // only emit a selectedFriendsChanged event if the list contains different friends
    if (
      !(
        this._selectedFriendsInternal.length === newSelectedFriends.length &&
        this._selectedFriendsInternal.every(friend => newSelectedFriends.includes(friend)) &&
        newSelectedFriends.every(friend => this._selectedFriendsInternal.includes(friend))
      )
    ) {
      this._selectedFriendsInternal = newSelectedFriends;
      this.emit('selectedFriendsChanged', newSelectedFriends);
    }
  }

  public get interactableEmitter() {
    return this._interactableEmitter;
  }

  public get viewingAreas() {
    return this._viewingAreas;
  }

  public set viewingAreas(newViewingAreas: ViewingAreaController[]) {
    this._viewingAreas = newViewingAreas;
    this.emit('viewingAreasChanged', newViewingAreas);
  }

  /**
   * Begin interacting with an interactable object. Emits an event to all listeners.
   * @param interactedObj
   */
  public interact<T extends Interactable>(interactedObj: T) {
    this._interactableEmitter.emit(interactedObj.getType(), interactedObj);
  }

  /**
   * End interacting with an interactable object. Emits an event to all listeners.
   * @param objectNoLongerInteracting
   */
  public interactEnd(objectNoLongerInteracting: Interactable) {
    this._interactableEmitter.emit('endInteraction', objectNoLongerInteracting);
  }

  /**
   * Registers listeners for the events that can come from the server to our socket
   */
  registerSocketListeners() {
    /**
     * On chat messages, forward the messages to listeners who subscribe to the controller's events
     */
    this._socket.on('chatMessage', message => {
      this.emit('chatMessage', message);
    });
    /**
     * On changes to town settings, update the local state and emit a townSettingsUpdated event to
     * the controller's event listeners
     */
    this._socket.on('townSettingsUpdated', update => {
      const newFriendlyName = update.friendlyName;
      if (newFriendlyName !== undefined) {
        this._friendlyName = newFriendlyName;
      }
      if (update.isPubliclyListed !== undefined) {
        this._townIsPubliclyListed = update.isPubliclyListed;
      }
    });
    /**
     * On town closing events, emit a disconnect message to the controller's event listeners, and
     * return to the login screen
     */
    this._socket.on('townClosing', () => {
      this.emit('disconnect');
      this._loginController.setTownController(null);
    });
    /**
     * When a new player joins the town, update our local state of players in the town and notify
     * the controller's event listeners that the player has moved to their starting location.
     *
     * Note that setting the players array will also emit an event that the players in the town have changed.
     */
    this._socket.on('playerJoined', newPlayer => {
      const newPlayerObj = PlayerController.fromPlayerModel(newPlayer);
      this.players = this.players.concat([newPlayerObj]);
      this.emit('playerMoved', newPlayerObj);
    });
    /**
     * When a player disconnects from the town, update local state
     *
     * Note that setting the players array will also emit an event that the players in the town have changed.
     */
    this._socket.on('playerDisconnect', disconnectedPlayer => {
      this.players = this.players.filter(eachPlayer => eachPlayer.id !== disconnectedPlayer.id);

      // if the disconnectedPlayer is in our friends list, remove it from our friends as well
      this._removePlayerControllerFromFriendsList(disconnectedPlayer.id);

      // if the disconnectedPlayer is a selectedFriend, deselect them
      const controllerToRemove = this.selectedFriends.find(
        player => player.id == disconnectedPlayer.id,
      );
      if (controllerToRemove) {
        this.deselectFriend(controllerToRemove);
      }

      // clear any friend requests where disconnectedPlayer is either the actor or affected
      const updatedRequestList = [...this.playerFriendRequests];
      this.playerFriendRequests = updatedRequestList.filter(
        request =>
          !(request.actor === disconnectedPlayer.id || request.affected === disconnectedPlayer.id),
      );
    });
    /**
     * When a player moves, update local state and emit an event to the controller's event listeners
     */
    this._socket.on('playerMoved', movedPlayer => {
      const playerToUpdate = this.players.find(eachPlayer => eachPlayer.id === movedPlayer.id);
      if (playerToUpdate) {
        if (playerToUpdate === this._ourPlayer) {
          /*
           * If we are told that WE moved, we shouldn't update our x,y because it's probably lagging behind
           * real time. However: we SHOULD update our interactable ID, because its value is managed by the server
           */
          playerToUpdate.location.interactableID = movedPlayer.location.interactableID;
        } else {
          playerToUpdate.location = movedPlayer.location;
          // find the player in our friends list whose location we also want to update
          const friendToUpdate = this.playerFriends.find(
            eachFriend => eachFriend.id === movedPlayer.id,
          );
          // if they are present
          if (friendToUpdate) {
            friendToUpdate.location = movedPlayer.location;
          }

          // find the player in our selectedFriends list whose location we also want to update
          const selectedFriendToUpdate = this.selectedFriends.find(
            eachFriend => eachFriend.id === movedPlayer.id,
          );
          // if they are present
          if (selectedFriendToUpdate) {
            selectedFriendToUpdate.location = movedPlayer.location;
          }
        }
        this.emit('playerMoved', playerToUpdate);
      } else {
        const newPlayer = PlayerController.fromPlayerModel(movedPlayer);
        this.players = this.players.concat(newPlayer);
        this.emit('playerMoved', newPlayer);
      }
    });

    /**
     * When an interactable's state changes, push that update into the relevant controller, which is assumed
     * to be either a Viewing Area or a Conversation Area, and which is assumed to already be represented by a
     * ViewingAreaController or ConversationAreaController that this TownController has.
     *
     * If a conversation area transitions from empty to occupied (or occupied to empty), this handler will emit
     * a conversationAreasChagned event to listeners of this TownController.
     *
     * If the update changes properties of the interactable, the interactable is also expected to emit its own
     * events (@see ViewingAreaController and @see ConversationAreaController)
     */
    this._socket.on('interactableUpdate', interactable => {
      if (isConversationArea(interactable)) {
        const updatedConversationArea = this.conversationAreas.find(c => c.id === interactable.id);
        if (updatedConversationArea) {
          const emptyNow = updatedConversationArea.isEmpty();
          updatedConversationArea.topic = interactable.topic;
          updatedConversationArea.occupants = this._playersByIDs(interactable.occupantsByID);
          const emptyAfterChange = updatedConversationArea.isEmpty();
          if (emptyNow !== emptyAfterChange) {
            this.emit('conversationAreasChanged', this._conversationAreasInternal);
          }
        }
      } else if (isViewingArea(interactable)) {
        const updatedViewingArea = this._viewingAreas.find(
          eachArea => eachArea.id === interactable.id,
        );
        updatedViewingArea?.updateFrom(interactable);
      }
    });

    /*
     * When a conversation area group invite is sent out, check to see if our player was among
     * the list of invitees. If so, add this new teleport invite to the exisitng list of invites,
     * if there isn't already an indentical invite present.
     *
     * If the invite was unique, emits a conversationAreaInvitesChanged event.
     */
    this._socket.on('conversationAreaRequestSent', convAreaInviteRequest => {
      const affectedPlayers = convAreaInviteRequest.requested;
      const newRequester = convAreaInviteRequest.requester;
      const newRequesterLocation = convAreaInviteRequest.requesterLocation;
      // find the index of our player within the list of recipients in this convAreaInviteRequest
      const ourPlayerIndex: number = affectedPlayers.findIndex(
        invitedPlayerID => invitedPlayerID === this.ourPlayer.id,
      );

      // If our player is found within the list of recipients, use its index to create a new
      // singular invite and check for a duplicate invite already in the current list of
      // conversation area invites. If no duplicate found, add our player to a copy of the current
      // list of _conversationAreaInvitesInternal and call its setter
      if (ourPlayerIndex !== -1) {
        const newInvite: TeleportInviteSingular = {
          requester: newRequester,
          requested: affectedPlayers[ourPlayerIndex],
          requesterLocation: newRequesterLocation,
        };
        // check if our player already has an existing invite from this new requester to this new
        // location. i.e., this invite is not a functional duplicate of an already existing one
        const potentialDuplicateInviteIndex: number =
          this._conversationAreaInvitesInternal.findIndex(
            invite =>
              invite.requester === newRequester &&
              invite.requesterLocation.interactableID === newRequesterLocation.interactableID,
          );
        // if invite was not found in current list of conversation area invites, add it
        if (potentialDuplicateInviteIndex === -1) {
          const newConvoAreaInvites: TeleportInviteSingular[] =
            this._conversationAreaInvitesInternal.concat([newInvite]);
          this.conversationAreaInvites = newConvoAreaInvites;
        }
      }
    });

    /*
     * When a conversation area individual invite is accepted, use the remover helper to
     * deal with removing the invite.
     *
     * If the invite did exist and was removed, emits a conversationAreaInvitesChanged event.
     */
    this._socket.on('conversationAreaRequestAccepted', conversationAreaInviteRequest => {
      this._removeTeleportInviteFromInvites(conversationAreaInviteRequest);
    });

    /**
     * When a conversation area individual invite is declined, use the remover helper to
     * deal with removing the invite.
     *
     * If the invite did exist and was removed, emits a conversationAreaInvitesChanged event.
     */
    this._socket.on('conversationAreaRequestDeclined', conversationAreaInviteRequest => {
      this._removeTeleportInviteFromInvites(conversationAreaInviteRequest);
    });

    /**
     *
     * When any player sends a friend request to another player, we check if that friend request was sent BY or TO us.
     * In either of those cases, we store those friend requests for the UI to render and emit an event for the hook
     * to catch. Otherwise we can ignore the request.
     *
     * Assumes a player cannot send a friend request to themself. (UI will not allow this)
     *
     * Assumes a player cannot receive duplicate friend requests. (UI will not allow this)
     *
     * */
    this._socket.on('friendRequestSent', friendRequest => {
      const { actor, affected } = friendRequest;
      const ourPlayerID = this.ourPlayer.id;

      // if our player is involved in the incoming request, save it
      if (actor === ourPlayerID || affected === ourPlayerID) {
        const updatedFriendRequests = [...this.playerFriendRequests];
        updatedFriendRequests.push(friendRequest);
        // use setter because it emits necessary event
        this.playerFriendRequests = updatedFriendRequests;
      }
    });

    /**
     *
     * When any player declines a friend request, we check to see if the original request was sent to or from us.
     * In either of those cases, we remove the request from our list of stored friend requests, for the UI to know
     * what to render. Otherwise ignore the request.
     *
     * Right now, when the backend emits a friendRequestDeclined event, the actor is the decliner and the affected is
     * the initial sender. However, this means that when looking for the request we have to flip the actor and affected.
     * The proposed refactor is to make is so that friendRequestDeclined is emitted with the original friend request that
     * is being declined. (Backlog refactor)
     *
     * */
    this._socket.on('friendRequestDeclined', friendRequest => {
      // actor is decliner, affected is the initial sender of the request
      const { actor, affected } = friendRequest;

      // looking for a request from affected to actor, but only if one of them is our player
      // otherwise we shouldn't even have the request saved
      this._removeFriendRequestIfInvolved(affected, actor);
    });

    /**
     *
     * When a friend request is accepted, if we are one of the players in the accepted request,
     * update our list of requests by removing it, and add the other player into our friends list.
     *
     * Since actor is the receiver of the intiial request, we need to flip
     * the actor and affected to find the original request. (Backlog refactor)
     */
    this._socket.on('friendRequestAccepted', friendRequest => {
      // actor is accepter, affected is the initial sender of the request
      const { actor, affected } = friendRequest;
      const ourPlayerID = this.ourPlayer.id;

      // if our player is involved in the accepted request, remove it
      this._removeFriendRequestIfInvolved(affected, actor);

      // update friends list (only needs to be done on this controller because the other controller
      // will also receive this event)
      if (actor === ourPlayerID) {
        this._addPlayerControllerToFriendsList(affected);
      } else if (affected === ourPlayerID) {
        this._addPlayerControllerToFriendsList(actor);
      }

      // Emits the event to the TownController itself so it can be caught in TownMap to render
      // a toast message indicating we gained a friend IF we are actor or affected
      this.emit('friendRequestAccepted', friendRequest);
    });

    /**
     * Whenever a player cancels a friend request, if we are either the remover or the removed,
     * remove that friend request from our list of requests
     */
    this._socket.on('friendRequestCanceled', playerToPlayerUpdate => {
      // actor is sender / canceler, affected is original recipient
      const { actor, affected } = playerToPlayerUpdate;

      // if our player is involved in the canceled request remove it
      this._removeFriendRequestIfInvolved(actor, affected);
    });

    /**
     * Whenever a player removes a friend, if we are either the remover or the removed,
     * remove the other player from our friends list.
     */
    this._socket.on('friendRemoved', playerToPlayerUpdate => {
      // actor is remover, affected is the removed friend
      const { actor, affected } = playerToPlayerUpdate;
      const ourPlayerID = this.ourPlayer.id;

      // if our player is involved in the removal
      if (actor === ourPlayerID) {
        // if we are the actor, remove affected
        this._removePlayerControllerFromFriendsList(affected);
      } else if (affected === ourPlayerID) {
        // if we are the affected, remove actor
        this._removePlayerControllerFromFriendsList(actor);
      }
    });

    /**
     * Whenever a mini message event is recieved, forward the messages to listeners who
     * subscribe to the controller's events.
     */
    this._socket.on('miniMessageSent', miniMessage => {
      this.emit('newMiniMessageReceived', miniMessage);
    });
  }

  /**
   * Given a PlayerToPlayerUpdate, if this.ourPlayer is either the actor or affected,
   * remove this request from our list of friendRequests.
   *
   * @param requestToRemove the friend request from actor to affected to remove
   */
  private _removeFriendRequestIfInvolved(initialSenderID: string, initialReceiverID: string) {
    const ourPlayerID = this.ourPlayer.id;

    if (initialSenderID === ourPlayerID || initialReceiverID === ourPlayerID) {
      const updatedRequestList = this.playerFriendRequests.filter(
        // the person being accepted (affected) is the sender of the original request (request.actor)
        // the accepter (actor) is the recipient (request.affected) of the request we want to remove
        request => !(request.actor === initialSenderID && request.affected === initialReceiverID),
      );
      this.playerFriendRequests = [...updatedRequestList];
    }
  }

  /**
   * Given the ID of a player in the town, removes the PlayerController matching that ID
   * from our friends list. Does not do anything if that player is not in our friends list
   *
   * @param id the id of the player controller to remove from the friends list
   */
  private _removePlayerControllerFromFriendsList(id: string) {
    const updatedFriendsList = [...this.playerFriends];

    // find the player controller to remove by matching id
    const playerControllerToRemove = updatedFriendsList.find(
      controller => controller.id === id,
    ) as PlayerController;

    // Remove that controller from friends list from friends list
    // (Should exist by virtue of how the UI works but checking in case)
    if (playerControllerToRemove) {
      const indexToRemove = updatedFriendsList.indexOf(playerControllerToRemove);
      if (indexToRemove >= 0) {
        updatedFriendsList.splice(indexToRemove, 1);
      }
    }

    // update the playerFriends list
    this.playerFriends = [...updatedFriendsList];
  }

  /**
   * Given the ID of a player in the town, adds the PlayerController matching that ID
   * from our friends list.
   * Assume we can find actor/affected in the player list because you can't friend request someone who
   * isn't a Player in Town (or accept a friend request of someone who isn't a Player).
   *
   * @param id the id of the player controller to add to the friends list
   */
  private _addPlayerControllerToFriendsList(id: string) {
    const updatedFriendsList = [...this.playerFriends];

    // Get new friend's PlayerController from player list
    const controllerToAdd = this.players.find(
      controller => controller.id === id,
    ) as PlayerController;

    // Add it to the friend List
    // Should exist by virtue of how the UI works but check in case
    if (controllerToAdd) {
      updatedFriendsList.push(controllerToAdd);
    }

    // update the playerFriends list
    this.playerFriends = [...updatedFriendsList];
  }

  /*
   * Check to see if our player was the requested person in the given invite. If so, remove
   * this invite from the current list of invites.
   *
   * @param teleportInviteToRemove the teleport invite to remove, if found
   */
  private _removeTeleportInviteFromInvites(teleportInviteToRemove: TeleportInviteSingular) {
    if (teleportInviteToRemove.requested === this.ourPlayer.id) {
      const newInvitesFiltered = this._conversationAreaInvitesInternal.filter(
        invite =>
          !(
            invite.requesterLocation.x === teleportInviteToRemove.requesterLocation.x &&
            invite.requesterLocation.y === teleportInviteToRemove.requesterLocation.y &&
            invite.requester === teleportInviteToRemove.requester
          ),
      );
      this.conversationAreaInvites = newInvitesFiltered;
    }
  }

  /**
   * Emit a movement event for the current player, updating the state locally and
   * also notifying the townService that our player moved.
   *
   * Note: it is the responsibility of the townService to set the 'interactableID' parameter
   * of the player's location, and any interactableID set here may be overwritten by the townService
   *
   * @param newLocation
   */
  public emitMovement(newLocation: PlayerLocation) {
    this._socket.emit('playerMovement', newLocation);
    const ourPlayer = this._ourPlayer;
    assert(ourPlayer);
    ourPlayer.location = newLocation;
    this.emit('playerMoved', ourPlayer);
  }

  /**
   * Emit a chat message to the townService
   *
   * @param message
   */
  public emitChatMessage(message: ChatMessage) {
    this._socket.emit('chatMessage', message);
  }

  /**
   * Update the settings of the current town. Sends the request to update the settings to the townService,
   * and does not update the local model. If the update is successful, then the townService will inform us
   * of the updated settings. Throws an error if the request is not successful.
   *
   * @param roomUpdatePassword
   * @param updatedSettings
   */
  async updateTown(
    roomUpdatePassword: string,
    updatedSettings: { isPubliclyListed: boolean; friendlyName: string },
  ) {
    await this._townsService.updateTown(this._townID, roomUpdatePassword, updatedSettings);
  }

  /**
   * Delete the current town. Sends the request to the townService, and sends an error if the request is
   * not successful
   *
   * @param roomUpdatePassword
   */
  async deleteTown(roomUpdatePassword: string) {
    await this._townsService.deleteTown(this._townID, roomUpdatePassword);
  }

  /**
   * Create a new conversation area, sending the request to the townService. Throws an error if the request
   * is not successful. Does not immediately update local state about the new conversation area - it will be
   * updated once the townService creates the area and emits an interactableUpdate
   *
   * @param newArea
   */
  async createConversationArea(newArea: {
    topic?: string;
    id: string;
    occupantsByID: Array<string>;
  }) {
    await this._townsService.createConversationArea(this.townID, this.sessionToken, newArea);
  }

  /**
   * Create a new viewing area, sending the request to the townService. Throws an error if the request
   * is not successful. Does not immediately update local state about the new viewing area - it will be
   * updated once the townService creates the area and emits an interactableUpdate
   *
   * @param newArea
   */
  async createViewingArea(newArea: ViewingAreaModel) {
    await this._townsService.createViewingArea(this.townID, this.sessionToken, newArea);
  }

  /**
   * Disconnect from the town, notifying the townService that we are leaving and returning
   * to the login page
   */
  public disconnect() {
    this._socket.disconnect();
    this._loginController.setTownController(null);
  }

  /**
   * Connect to the townService. Throws an error if it is unable to connect
   * @returns
   */
  public async connect() {
    /*
         The connection is only valid if we receive an 'initialize' callback, and is invalid if the disconnect
         handler is called. Wrap the return of connect in a promise that is resolved upon initialize or rejected
         upon disconnect.
         */
    return new Promise<void>((resolve, reject) => {
      this._socket.connect();
      this._socket.on('initialize', initialData => {
        this._providerVideoToken = initialData.providerVideoToken;
        this._friendlyNameInternal = initialData.friendlyName;
        this._townIsPubliclyListedInternal = initialData.isPubliclyListed;
        this._sessionToken = initialData.sessionToken;
        this.players = initialData.currentPlayers.map(eachPlayerModel =>
          PlayerController.fromPlayerModel(eachPlayerModel),
        );

        this._conversationAreas = [];
        this._viewingAreas = [];
        this.conversationAreaInvites = [];
        this.playerFriendRequests = [];
        this._playerFriendsInternal = [];
        this._selectedFriendsInternal = [];
        initialData.interactables.forEach(eachInteractable => {
          if (isConversationArea(eachInteractable)) {
            this._conversationAreasInternal.push(
              ConversationAreaController.fromConversationAreaModel(
                eachInteractable,
                this._playersByIDs.bind(this),
              ),
            );
          } else if (isViewingArea(eachInteractable)) {
            this._viewingAreas.push(new ViewingAreaController(eachInteractable));
          }
        });
        this._userID = initialData.userID;
        this._ourPlayer = this.players.find(eachPlayer => eachPlayer.id == this.userID);
        this.emit('connect', initialData.providerVideoToken);
        resolve();
      });
      this._socket.on('disconnect', () => {
        reject(new Error('Invalid town ID'));
      });
    });
  }

  /**
   * Retrieve the viewing area controller that corresponds to a viewingAreaModel, creating one if necessary
   *
   * @param viewingArea
   * @returns
   */
  public getViewingAreaController(viewingArea: ViewingArea): ViewingAreaController {
    const existingController = this._viewingAreas.find(
      eachExistingArea => eachExistingArea.id === viewingArea.name,
    );
    if (existingController) {
      return existingController;
    } else {
      const newController = new ViewingAreaController({
        elapsedTimeSec: 0,
        id: viewingArea.name,
        isPlaying: false,
        video: viewingArea.defaultVideoURL,
      });
      this._viewingAreas.push(newController);
      return newController;
    }
  }

  /**
   * Emit a viewing area update to the townService.
   * @param viewingArea The Viewing Area Controller that is updated and should be emitted
   *    with the event
   */
  public emitViewingAreaUpdate(viewingArea: ViewingAreaController) {
    this._socket.emit('interactableUpdate', viewingArea.viewingAreaModel());
  }

  /**
   * Determine which players are "nearby" -- that they should be included in our video call
   */
  public nearbyPlayers(): PlayerController[] {
    const isNearby = (p: PlayerController) => {
      if (p.location && this.ourPlayer.location) {
        if (this.ourPlayer.location.interactableID || p.location.interactableID) {
          return p.location.interactableID === this.ourPlayer.location.interactableID;
        }
        const dx = p.location.x - this.ourPlayer.location.x;
        const dy = p.location.y - this.ourPlayer.location.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        return d < 80;
      }
      return false;
    };
    return this.players.filter(p => isNearby(p));
  }

  private _playersByIDs(playerIDs: string[]): PlayerController[] {
    return this._playersInternal.filter(eachPlayer => playerIDs.includes(eachPlayer.id));
  }

  /**
   * Emits a selectedFriendsChanged if we are selecting a friend who is not already selected.
   * Updates this.selectedFriends list to include friendToSelect. Assumes this player IS already a friend (UI enforced)
   * and does nothing if the friend is already selected
   * @param friendToSelect holds the current PlayerController to add to the selectedFriends list
   */
  public selectFriend(friendToSelect: PlayerController): void {
    // if the friendToSelect is NOT already selected
    if (this.selectedFriends.indexOf(friendToSelect) == -1) {
      const newSelected = [...this.selectedFriends];
      newSelected.push(friendToSelect);
      this.selectedFriends = [...newSelected];
    }
    // else do nothing
  }

  /**
   * Emits a selectedFriendsChanged if we are deselecting a friend who was previously selected.
   * Updates this.selectedFriends list to NOT include friendToDeselect. Assumes this player IS already a friend (UI enforced)
   * and does nothing if the friend is already deselected
   * @param friendToDeselect holds the current PlayerController to add to the selectedFriends list
   */
  public deselectFriend(friendToDeselect: PlayerController): void {
    const indexToRemove = this.selectedFriends.indexOf(friendToDeselect);

    // if the friendToDeselect exists in the selected list
    if (indexToRemove >= 0) {
      const newSelected = [...this.selectedFriends];
      newSelected.splice(indexToRemove, 1);
      this.selectedFriends = [...newSelected];
    }
    // else do nothing
  }

  /**
   * Emits a acceptFriendRequest event to the townService.
   * @param acceptedRequest the friend request - holds the current player and the player whose
   *                        friend request was accepted.
   */
  public clickedAcceptFriendRequest(acceptedRequest: PlayerToPlayerUpdate): void {
    this._socket.emit('acceptFriendRequest', acceptedRequest);
  }

  /**
   * Emits a declineFriendRequest event to the townService.
   * @param declinedRequest the friend reqeust - holds the current player and the player whose
   *                        friend request was declined
   */
  public clickedDeclineFriendRequest(declinedRequest: PlayerToPlayerUpdate): void {
    this._socket.emit('declineFriendRequest', declinedRequest);
  }

  /**
   * Emits a playerMovement event to the TownService.
   * @param playerDestinationLocation the location to teleport the current player to
   */
  public clickedTeleportToFriend(playerDestinationLocation: PlayerLocation): void {
    this._socket.emit('playerMovement', playerDestinationLocation);
  }

  /**
   * Indicates that our player has sent a friend Request.
   * Emits a sendFriendRequest event to the townService.
   * @param sentRequest the friend request - holds the current player and the player whose
   *                    who is being requested
   */
  public clickedSendRequest(sentRequest: PlayerToPlayerUpdate): void {
    this._socket.emit('sendFriendRequest', sentRequest);
  }

  /**
   * Indicates that ourPlayer has canceled a friend Request.
   * Emits a cancelFriendRequest event to the townService.
   * @param canceledRequest the friend request being canceled - holds the current player and the player whose
   *                        who is being requested
   */
  public clickedCancelRequest(canceledRequest: PlayerToPlayerUpdate): void {
    this._socket.emit('cancelFriendRequest', canceledRequest);
  }

  /**
   * Emits a removeFriend event to the townService.
   * @param removedFriend holds the current player and the player who is being unfriended.
   */
  public clickedRemoveFriend(removedFriend: PlayerToPlayerUpdate): void {
    this._socket.emit('removeFriend', removedFriend);
  }

  /**
   * Indicates that ourPlayer has declined a friend Request.
   * Emits a acceptConvAreaInvite event to the townService.
   * @param acceptedInvite the conv area invite - holds the player who accepted, the player whose
   *                       conv area invite was accepted, and the teleport destination.
   */
  public clickedAcceptConvAreaInvite(acceptedInvite: TeleportInviteSingular): void {
    this._socket.emit('acceptConvAreaInvite', acceptedInvite);
  }

  /**
   * Indicates that ourPlayer has declined a friend Request.
   * Emits a declineConvAreaInvite event to the townService.
   * @param declinedInvite the friend reqeust - holds the player who declined, the player whose
   *                       conv area invite was declined, and what would have been the teleport
   *                       destination.
   */
  public clickedDeclineConvAreaInvite(declinedInvite: TeleportInviteSingular): void {
    this._socket.emit('declineConvAreaInvite', declinedInvite);
  }

  /**
   * Emits a inviteAllToConvArea event to the townService if the Player who is requesting
   * is within a conversation area that is located in the town.
   * @param invite holds the requester, list of requested, and destination location,
   *               within the conversation area, that the requested would be transported to if
   *               they accepted the invite.
   */
  public clickedInviteAllToConvArea(invite: ConversationAreaGroupInvite): void {
    if (
      // check that the player is in a conversation areas before allowing the invite to be sent
      this.conversationAreas.find(area =>
        area.occupants.find(player => player.id === invite.requester),
      )
    ) {
      this._socket.emit('inviteAllToConvArea', invite);
    }
  }

  /**
   * Emits a sendMiniMessage event to the townService.
   * @param miniMessage The message to be sent - holds the sender, list of recipients (the
   *                     sender's currently selected friends), and the body of the message.
   */
  public clickedSendMiniMessage(miniMessage: MiniMessage): void {
    this._socket.emit('sendMiniMessage', miniMessage);
  }
}

/**
 * A react hook to retrieve the settings for this town
 *
 * This hook will cause components that use it to re-render when the settings change.
 *
 * This hook relies on the TownControllerContext.
 * @returns an object with the properties "friendlyName" and "isPubliclyListed",
 *  representing the current settings of the current town
 */
export function useTownSettings() {
  const townController = useTownController();
  const [friendlyName, setFriendlyName] = useState<string>(townController.friendlyName);
  const [isPubliclyListed, setIsPubliclyListed] = useState<boolean>(
    townController.townIsPubliclyListed,
  );
  useEffect(() => {
    const updateTownSettings = (update: TownSettingsUpdate) => {
      const newName = update.friendlyName;
      const newPublicSetting = update.isPubliclyListed;
      if (newName !== undefined) {
        setFriendlyName(newName);
      }
      if (newPublicSetting !== undefined) {
        setIsPubliclyListed(newPublicSetting);
      }
    };
    townController.addListener('townSettingsUpdated', updateTownSettings);
    return () => {
      townController.removeListener('townSettingsUpdated', updateTownSettings);
    };
  }, [townController]);
  return { friendlyName, isPubliclyListed };
}

/**
 * A react hook to retrieve a viewing area controller.
 *
 * This function will throw an error if the viewing area controller does not exist.
 *
 * This hook relies on the TownControllerContext.
 *
 * @param viewingAreaID The ID of the viewing area to retrieve the controller for
 *
 * @throws Error if there is no viewing area controller matching the specifeid ID
 */
export function useViewingAreaController(viewingAreaID: string): ViewingAreaController {
  const townController = useTownController();

  const viewingArea = townController.viewingAreas.find(eachArea => eachArea.id == viewingAreaID);
  if (!viewingArea) {
    throw new Error(`Requested viewing area ${viewingAreaID} does not exist`);
  }
  return viewingArea;
}

/**
 * A react hook to retrieve the active conversation areas. This hook will re-render any components
 * that use it when the set of conversation areas changes. It does *not* re-render its dependent components
 * when the state of one of those areas changes - if that is desired, @see useConversationAreaTopic and @see useConversationAreaOccupants
 *
 * This hook relies on the TownControllerContext.
 *
 * @returns the list of conversation area controllers that are currently "active"
 */
export function useActiveConversationAreas(): ConversationAreaController[] {
  const townController = useTownController();
  const [conversationAreas, setConversationAreas] = useState<ConversationAreaController[]>(
    townController.conversationAreas.filter(eachArea => !eachArea.isEmpty()),
  );
  useEffect(() => {
    const updater = (allAreas: ConversationAreaController[]) => {
      setConversationAreas(allAreas.filter(eachArea => !eachArea.isEmpty()));
    };
    townController.addListener('conversationAreasChanged', updater);
    return () => {
      townController.removeListener('conversationAreasChanged', updater);
    };
  }, [townController, setConversationAreas]);
  return conversationAreas;
}

/**
 * A react hook to retrieve the current conversation area requests. This hook will re-render any
 * components that use it when the set of conversation area requests changes.
 *
 * This hook relies on the TownControllerContext.
 *
 * @returns the list of conversation area requests that are currently un-answered (i.e.,
 * TownController.ourPlayer hasn't accepted or declined them yet)
 */
export function usePendingConversationAreaInvites(): TeleportInviteSingular[] {
  const townController = useTownController();
  const [conversationAreaInvites, setConversationAreaInvites] = useState<TeleportInviteSingular[]>(
    townController.conversationAreaInvites,
  );

  useEffect(() => {
    const updateInvites = (currentConvAreaInvites: TeleportInviteSingular[]) => {
      setConversationAreaInvites(currentConvAreaInvites);
    };
    townController.addListener('conversationAreaInvitesChanged', updateInvites);
    return () => {
      townController.removeListener('conversationAreaInvitesChanged', updateInvites);
    };
  }, [townController]);
  return conversationAreaInvites;
}

/**
 * A react hook to retrieve the current friend requests for the town controller's player.
 * This hook will re-render any components that use it when the set of friend requests
 * changes.
 *
 * This hook relies on the TownControllerContext.
 *
 * @returns the list of player friend requests that have been sent/received (but not answered).
 */
export function useCurrentPlayerFriendRequests(): PlayerToPlayerUpdate[] {
  const townController = useTownController();
  const [playerFriendRequests, setPlayerFriendRequests] = useState<PlayerToPlayerUpdate[]>(
    townController.playerFriendRequests,
  );

  useEffect(() => {
    const updateFriendRequests = (currentPlayerFriendRequests: PlayerToPlayerUpdate[]) => {
      setPlayerFriendRequests(currentPlayerFriendRequests);
    };
    townController.addListener('playerFriendRequestsChanged', updateFriendRequests);
    return () => {
      townController.removeListener('playerFriendRequestsChanged', updateFriendRequests);
    };
  }, [townController]);
  return playerFriendRequests;
}

/**
 * A react hook to retrieve the current friends for this town controller's player.
 * This hook will re-render any components that use it when the set of friends
 * changes.
 *
 * This hook relies on the TownControllerContext.
 *
 * @returns the list of player friends.
 */
export function useCurrentPlayerFriends(): PlayerController[] {
  const townController = useTownController();
  const [playerFriends, setPlayerFriends] = useState<PlayerController[]>(
    townController.playerFriends,
  );

  useEffect(() => {
    const updateFriends = (currentPlayerFriends: PlayerController[]) => {
      setPlayerFriends(currentPlayerFriends);
    };
    townController.addListener('playerFriendsChanged', updateFriends);
    return () => {
      townController.removeListener('playerFriendsChanged', updateFriends);
    };
  }, [townController]);
  return playerFriends;
}

/**
 * A react hook to retrieve the current selected friends for this town controller's UI/player.
 * This hook will re-render any components that use it when the set of selected friends
 * changes.
 *
 * @returns the list of player selected friends
 */
export function useSelectedFriends(): PlayerController[] {
  const townController = useTownController();
  const [selectedFriends, setSelectedFriends] = useState<PlayerController[]>(
    townController.selectedFriends,
  );

  useEffect(() => {
    const updateSelected = (newSelectedFriends: PlayerController[]) => {
      setSelectedFriends(newSelectedFriends);
    };

    townController.addListener('selectedFriendsChanged', updateSelected);
    return () => {
      townController.removeListener('selectedFriendsChanged', updateSelected);
    };
  }, [townController]);

  return selectedFriends;
}

/**
 * A react hook to return the PlayerController's corresponding to each player in the town.
 *
 * This hook will cause components that use it to re-render when the set of players in the town changes.
 *
 * This hook will *not* trigger re-renders if a player moves.
 *
 * This hook relies on the TownControllerContext.
 *
 * @returns an array of PlayerController's, representing the current set of players in the town
 */
export function usePlayers(): PlayerController[] {
  const townController = useTownController();
  const [players, setPlayers] = useState<PlayerController[]>(townController.players);
  useEffect(() => {
    townController.addListener('playersChanged', setPlayers);
    return () => {
      townController.removeListener('playersChanged', setPlayers);
    };
  }, [townController, setPlayers]);
  return players;
}

function samePlayers(a1: PlayerController[], a2: PlayerController[]) {
  if (a1.length !== a2.length) return false;
  const ids1 = a1.map(p => p.id).sort();
  const ids2 = a2.map(p => p.id).sort();
  return _.isEqual(ids1, ids2);
}

/**
 * A react hook to retrieve the interactable that is *currently* be interacted with by the player in this frontend.
 * A player is "interacting" with the Interactable if they are within it, and press the spacebar.
 *
 * This hook will cause any component that uses it to re-render when the object that the player is interacting with changes.
 *
 * This hook relies on the TownControllerContext.
 *
 * @param interactableType
 */
export function useInteractable<T extends Interactable>(
  interactableType: T['name'],
): T | undefined {
  const townController = useTownController();
  const [interactable, setInteractable] = useState<T | undefined>(undefined);
  useEffect(() => {
    const onInteract = (interactWith: T) => {
      setInteractable(interactWith);
    };
    const offInteract = () => {
      setInteractable(undefined);
    };
    townController.interactableEmitter.on(interactableType, onInteract);
    townController.interactableEmitter.on('endInteraction', offInteract);

    return () => {
      townController.interactableEmitter.off(interactableType, onInteract);
      townController.interactableEmitter.off('endInteraction', offInteract);
    };
  }, [interactableType, townController, setInteractable]);
  return interactable;
}
/**
 * A react hook to retrieve the players that should be included in the video call
 *
 * This hook will cause components that  use it to re-render when the set of players in the video call changes.
 *
 * This hook relies on the TownControllerContext.
 * @returns
 */
export function usePlayersInVideoCall(): PlayerController[] {
  const townController = useTownController();
  const [playersInCall, setPlayersInCall] = useState<PlayerController[]>([]);
  useEffect(() => {
    let lastRecalculatedNearbyPlayers = 0;
    let prevNearbyPlayers: PlayerController[] = [];
    const updatePlayersInCall = () => {
      const now = Date.now();
      // To reduce re-renders, only recalculate the nearby players every so often
      if (now - lastRecalculatedNearbyPlayers > CALCULATE_NEARBY_PLAYERS_DELAY) {
        lastRecalculatedNearbyPlayers = now;
        const nearbyPlayers = townController.nearbyPlayers();
        if (!samePlayers(nearbyPlayers, prevNearbyPlayers)) {
          prevNearbyPlayers = nearbyPlayers;
          setPlayersInCall(nearbyPlayers);
        }
      }
    };
    townController.addListener('playerMoved', updatePlayersInCall);
    townController.addListener('playersChanged', updatePlayersInCall);
    updatePlayersInCall();
    return () => {
      townController.removeListener('playerMoved', updatePlayersInCall);
      townController.removeListener('playersChanged', updatePlayersInCall);
    };
  }, [townController, setPlayersInCall]);
  return playersInCall;
}
