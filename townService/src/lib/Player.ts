import { nanoid } from 'nanoid';
import {
  Player as PlayerModel,
  PlayerLocation,
  TownEmitter,
  TeleportInviteSingular,
} from '../types/CoveyTownSocket';
/**
 * Each user who is connected to a town is represented by a Player object.
 */
export default class Player {
  /** The current location of this user in the world map * */
  public location: PlayerLocation;

  /** The unique identifier for this player * */
  private readonly _id: string;

  /** The player's username, which is not guaranteed to be unique within the town * */
  private readonly _userName: string;

  /** The secret token that allows this client to access our Covey.Town service for this town * */
  private readonly _sessionToken: string;

  /** The secret token that allows this client to access our video resources for this town * */
  private _videoToken?: string;

  /** The current set of friends this player has. */
  private _friends: Player[] = [];

  /** The current set of selected friends this player has. This list is used for requesting multiple friends
   * at once to join a conversation area, or sending a message to multiple friends. */
  private _selectedFriends: Player[] = [];

  /** The current list of invites to conversation areas that this player has recieved. */
  private _conversationAreaInvites: TeleportInviteSingular[] = [];

  /** A special town emitter that will emit events to the entire town BUT NOT to this player. */
  public readonly townEmitter: TownEmitter;

  constructor(userName: string, townEmitter: TownEmitter) {
    this.location = {
      x: 0,
      y: 0,
      moving: false,
      rotation: 'front',
    };
    this._userName = userName;
    this._id = nanoid();
    this._sessionToken = nanoid();
    this.townEmitter = townEmitter;
  }

  get userName(): string {
    return this._userName;
  }

  get id(): string {
    return this._id;
  }

  set videoToken(value: string | undefined) {
    this._videoToken = value;
  }

  get videoToken(): string | undefined {
    return this._videoToken;
  }

  get sessionToken(): string {
    return this._sessionToken;
  }

  toPlayerModel(): PlayerModel {
    return {
      id: this._id,
      location: this.location,
      userName: this._userName,
    };
  }

  get friends(): Player[] {
    return this._friends;
  }

  get selectedFriends(): Player[] {
    return this._selectedFriends;
  }

  get conversationAreaInvites(): TeleportInviteSingular[] {
    return this._conversationAreaInvites;
  }

  /**
   * Add the given player to this player's friends list.
   *
   * @param friendToAdd the player to add.
   */
  public addFriend(friendToAdd: Player): void {
    // make sure that the friend with the given ID is not already in the list of friends.
    // If they are already in the list of friends, ignore the addFriend request.
    if (!this._friends.find(friend => friend._id === friendToAdd._id)) {
      this._friends.push(friendToAdd);
    }
  }

  /**
   * Remove the given player from this player's friends list, AND the selected friend's list.
   *
   * @param friendToRemove player to remove from this player's friends list.
   */
  public removeFriend(friendToRemove: Player): void {
    const friendsListIndexToRemove = this._friends.indexOf(friendToRemove);
    if (friendsListIndexToRemove >= 0) {
      this._friends.splice(friendsListIndexToRemove, 1);
    }

    const selectedListIndexToRemove = this._selectedFriends.indexOf(friendToRemove);
    if (selectedListIndexToRemove >= 0) {
      this._selectedFriends.splice(selectedListIndexToRemove, 1);
    }
  }

  /**
   * Add the given friend to this player's selected friends list. Assumes this player is already a
   * friend of this player. It should not add anyone to the list who is already on the list.
   * It should not let you select someone who isn't a friend. Assumes that friend to select is
   * in the friends list as this should be enforced by the UI.
   *
   * @param friendToSelect player to add to the selected friends list.
   */
  public selectFriend(friendToSelect: Player): void {
    if (!this._selectedFriends.includes(friendToSelect)) {
      this._selectedFriends.push(friendToSelect);
    }
  }

  /**
   * Player to deselected (remove from the selected friends list).
   *
   * @param friendToDeselect player to remove from selected friends list.
   */
  public deselectFriend(friendToDeselect: Player): void {
    const selectedListIndexToRemove = this._selectedFriends.indexOf(friendToDeselect);
    if (selectedListIndexToRemove >= 0) {
      this._selectedFriends.splice(selectedListIndexToRemove, 1);
    }
  }

  /**
   * Adds the given ConversationAreaInvite to this player's list of invites. Ignores the request
   * if the conversation area request is already in the list of requests.
   *
   * @param invite the invite to add.
   */
  public addConversationAreaInvite(invite: TeleportInviteSingular): void {
    if (!this._conversationAreaInvites.includes(invite)) {
      this._conversationAreaInvites.push(invite);
    }
  }

  /**
   * Removes the given ConversationAreaInvite from this player's list of invites
   * (upon either accepting or decling an invite).
   *
   * @param inviteToRemove the ConversationAreaInvite to remove.
   */
  public removeConversationAreaInvite(inviteToRemove: TeleportInviteSingular): void {
    const inviteToRemoveIndex = this._conversationAreaInvites.indexOf(inviteToRemove);
    if (inviteToRemoveIndex >= 0) {
      this._conversationAreaInvites.splice(inviteToRemoveIndex, 1);
    }
  }
}
