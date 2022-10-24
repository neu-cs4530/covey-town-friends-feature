import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import Player from './Player';
import { MockedPlayer, mockPlayer } from '../TestUtils';
import { PlayerLocation, TeleportInviteSingular, TownEmitter } from '../types/CoveyTownSocket';
import Town from '../town/Town';

describe('Player', () => {
  const townEmitter: DeepMockProxy<TownEmitter> = mockDeep<TownEmitter>();
  let town: Town;
  let player: Player;
  let player2: Player;
  let player3: Player;
  let player4: Player;
  let player5: Player;
  let playerTestData: MockedPlayer;
  let playerTestData2: MockedPlayer;
  let playerTestData3: MockedPlayer;
  let playerTestData4: MockedPlayer;
  let playerTestData5: MockedPlayer;
  let playerLocation: PlayerLocation;
  let invite: TeleportInviteSingular;
  let invite2: TeleportInviteSingular;

  beforeEach(async () => {
    town = new Town(nanoid(), false, nanoid(), townEmitter);
    playerTestData = mockPlayer(town.townID);
    playerTestData2 = mockPlayer(town.townID);
    playerTestData3 = mockPlayer(town.townID);
    playerTestData4 = mockPlayer(town.townID);
    playerTestData5 = mockPlayer(town.townID);
    player = await town.addPlayer(playerTestData.userName, playerTestData.socket);
    player2 = await town.addPlayer(playerTestData2.userName, playerTestData2.socket);
    player3 = await town.addPlayer(playerTestData3.userName, playerTestData3.socket);
    player4 = await town.addPlayer(playerTestData4.userName, playerTestData4.socket);
    player5 = await town.addPlayer(playerTestData5.userName, playerTestData5.socket);
    playerTestData.player = player;
    playerTestData2.player = player2;
    playerTestData3.player = player3;
    playerTestData4.player = player4;
    playerTestData5.player = player5;
    // Set this dummy player to be off the map so that they do not show up in conversation areas
    playerTestData.moveTo(-1, -1);
    playerTestData2.moveTo(-5, -5);
    playerTestData3.moveTo(-4, -4);
    playerTestData4.moveTo(-3, -3);
    playerTestData5.moveTo(-3, -3);
    playerLocation = player.location;
    invite = {
      requester: player,
      requested: player2,
      requesterLocation: playerLocation,
    };
    invite2 = {
      requester: player3,
      requested: player4,
      requesterLocation: player3.location,
    };
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
    it('Removes the given player from the selected friend list IF the friend was selected', () => {
      player.addFriend(player2);
      player.addFriend(player3);
      player.selectFriend(player3);
      expect(player.friends.length).toEqual(2);
      expect(player.selectedFriends.length).toEqual(1);
      player.removeFriend(player2);
      expect(player.friends).toEqual([player3]);
      expect(player.selectedFriends).toEqual([player3]);
      player.removeFriend(player3);
      expect(player.friends).toEqual([]);
      expect(player.selectedFriends).toEqual([]);
    });
    it('Does nothing if there is no such Friend to remove', () => {
      player.addFriend(player2);
      expect(player.friends.length).toEqual(1);
      player.removeFriend(player3);
      expect(player.friends.length).toEqual(1);
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
    it('Does NOT duplicate a selected friend in the list when added twice.', () => {
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
    it('Does nothing if given player is not in the list/not selected', () => {
      player.addFriend(player2);
      expect(player.friends.length).toEqual(1);
      expect(player.selectedFriends.length).toEqual(0);
      player.deselectFriend(player2);
      expect(player.friends.length).toEqual(1);
      expect(player.selectedFriends.length).toEqual(0);
    });
  });
  describe('addConversationAreaInvite', () => {
    it('Adds an invite to the list of conversation area invites', () => {
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
    it('Removes an invited player from the list of conversation area invites', () => {
      player.addFriend(player2);
      town.inviteToConversationArea(player, [player2]);
      expect(player2.conversationAreaInvites.length).toEqual(1);
      player2.removeConversationAreaInvite(invite);
      expect(player2.conversationAreaInvites.length).toEqual(0);
    });
    it('Removes the last invited player from the list of conversation area invites', () => {
      player.addFriend(player4);
      player2.addFriend(player4);
      player3.addFriend(player4);
      expect(player4.conversationAreaInvites.length).toEqual(0);
      town.inviteToConversationArea(player, [player4]);
      town.inviteToConversationArea(player2, [player4]);
      town.inviteToConversationArea(player3, [player4]);
      expect(player4.conversationAreaInvites.length).toEqual(3);
      player4.removeConversationAreaInvite(invite2);
      expect(player4.conversationAreaInvites.length).toEqual(2);
    });
    it('Does nothing if there is no such conversation area invite to remove', () => {
      player.addFriend(player3);
      player.addFriend(player4);
      town.inviteToConversationArea(player3, [player4]);
      expect(player4.conversationAreaInvites.length).toEqual(1);
      player4.removeConversationAreaInvite(invite);
      expect(player4.conversationAreaInvites.length).toEqual(1);
    });
    it('Should see 2 invites from the same location but dif players as a different invite', () => {
      town.inviteToConversationArea(player4, [player2]);
      town.inviteToConversationArea(player5, [player2]);
      expect(player2.conversationAreaInvites.length).toEqual(2);
      player2.removeConversationAreaInvite({
        requester: player4,
        requested: player2,
        requesterLocation: player4.location,
      });
      expect(player2.conversationAreaInvites).toStrictEqual([
        {
          requester: player5,
          requested: player2,
          requesterLocation: player5.location,
        },
      ]);
    });
  });
});
