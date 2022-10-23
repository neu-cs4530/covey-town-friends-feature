import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import Player from './Player';
import { MockedPlayer, mockPlayer } from '../TestUtils';
import { TeleportInviteSingular, TownEmitter } from '../types/CoveyTownSocket';
import Town from '../town/Town';

describe('Player', () => {
  const townEmitter: DeepMockProxy<TownEmitter> = mockDeep<TownEmitter>();
  let town: Town;
  let player: Player;
  let player2: Player;
  let playerTestData: MockedPlayer;
  let playerTestData2: MockedPlayer;

  beforeEach(async () => {
    town = new Town(nanoid(), false, nanoid(), townEmitter);
    playerTestData = mockPlayer(town.townID);
    playerTestData2 = mockPlayer('mockPlayer2');
    player = await town.addPlayer(playerTestData.userName, playerTestData.socket);
    player2 = await town.addPlayer(playerTestData2.userName, playerTestData2.socket);
    playerTestData.player = player;
    playerTestData2.player = player2;
    // Set this dummy player to be off the map so that they do not show up in conversation areas
    playerTestData.moveTo(-1, -1);
    playerTestData2.moveTo(-5, -5);

    mockReset(townEmitter);
  });
  describe('addFriend', () => {
    it('Add the given player to this players friends list', () => {
      expect(player.friends.length).toEqual(0);
      player.addFriend(player2);
      expect(player.friends.length).toEqual(1);
    });
    it('Does not add the repeated player to this players friends list', () => {
      expect(player.friends.length).toEqual(0);
      player.addFriend(player2);
      player.addFriend(player2);
      expect(player.friends.length).toEqual(1);
    });
  });
  describe('removeFriend', () => {
    it('Removes the given player from the other players friends list', () => {
      player.addFriend(player2);
      expect(player.friends.length).toEqual(1);
      player.removeFriend(player2);
      expect(player.friends.length).toEqual(0);
    });
    it('Removes the other player from the given players friends list', () => {
      player.addFriend(player2);
      expect(player2.friends.length).toEqual(1);
      player.removeFriend(player2);
      expect(player2.friends.length).toEqual(0);
    });
  });
  describe('selectFriends', () => {
    it('Adds the other player to the current players selected friends list', () => {
      player.addFriend(player2);
      expect(player.friends.length).toEqual(1);
      expect(player.selectedFriends.length).toEqual(0);
      player.selectFriend(player2);
      expect(player.friends.length).toEqual(1);
      expect(player.selectedFriends.length).toEqual(1);
    });
    it('Does not add the selector to the selectees selected friends list', () => {
      player.addFriend(player2);
      expect(player2.friends.length).toEqual(1);
      expect(player2.selectedFriends.length).toEqual(0);
      player.selectFriend(player2);
      expect(player2.friends.length).toEqual(1);
      expect(player2.selectedFriends.length).toEqual(0);
    });
    it('Does duplicate a selected friend in the list when added twice.', () => {
      player.addFriend(player2);
      expect(player.friends.length).toEqual(1);
      expect(player.selectedFriends.length).toEqual(0);
      player.selectFriend(player2);
      player.selectFriend(player2);
      expect(player.friends.length).toEqual(1);
      expect(player.selectedFriends.length).toEqual(1);
    });
  });
  describe('deselectFriend', () => {
    it('Removes the other player from the current players selected friends list', () => {
      player.addFriend(player2);
      expect(player.friends.length).toEqual(1);
      expect(player.selectedFriends.length).toEqual(0);
      player.selectFriend(player2);
      expect(player.friends.length).toEqual(1);
      expect(player.selectedFriends.length).toEqual(1);
      player.deselectFriend(player2);
      expect(player.friends.length).toEqual(1);
      expect(player.selectedFriends.length).toEqual(0);
    });
    it('Does not change the selectees selected friends list', () => {
      player.addFriend(player2);
      expect(player2.friends.length).toEqual(1);
      expect(player2.selectedFriends.length).toEqual(0);
      player.selectFriend(player2);
      expect(player2.friends.length).toEqual(1);
      expect(player2.selectedFriends.length).toEqual(0);
      player.deselectFriend(player2);
      expect(player2.friends.length).toEqual(1);
      expect(player2.selectedFriends.length).toEqual(0);
    });
  });
  describe('addConversationAreaInvite', () => {
    const invite: TeleportInviteSingular = {
      requester: player,
      requested: player2,
      requesterLocation: {
        x: -1,
        y: -1,
        rotation: 'front',
        moving: false,
      },
    };
    it('Adds an invited to the list of conversation area invites', () => {
      player.addFriend(player2);
      expect(player.conversationAreaInvites.length).toEqual(0);
      player.addConversationAreaInvite(invite);
      expect(player.conversationAreaInvites.length).toEqual(1);
    });
    it('Does not add duplicate invites to the list of conversation area invites', () => {
      player.addFriend(player2);
      expect(player.conversationAreaInvites.length).toEqual(0);
      player.addConversationAreaInvite(invite);
      player.addConversationAreaInvite(invite);
      expect(player.conversationAreaInvites.length).toEqual(1);
    });
  });
  describe('removeConversationAreaInvite', () => {
    const invite: TeleportInviteSingular = {
      requester: player,
      requested: player2,
      requesterLocation: {
        x: -1,
        y: -1,
        rotation: 'front',
        moving: false,
      },
    };

    it('Adds an invited to the list of conversation area invites', () => {
      player.addFriend(player2);
      expect(player.conversationAreaInvites.length).toEqual(1);
      player.removeConversationAreaInvite(invite);
      expect(player.conversationAreaInvites.length).toEqual(0);
    });
  });
});
