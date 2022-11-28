import { mock, mockClear, MockProxy } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { MockedPlayer, mockPlayer } from '../../../townService/src/TestUtils';
import { LoginController } from '../contexts/LoginControllerContext';
import { ViewingArea } from '../generated/client';
import {
  EventNames,
  getEventListener,
  mockTownControllerConnection,
  ReceivedEventParameter,
} from '../TestUtils';
import {
  ChatMessage,
  ConversationArea as ConversationAreaModel,
  ConversationAreaGroupInvite,
  CoveyTownSocket,
  MiniMessage,
  Player as PlayerModel,
  PlayerLocation,
  PlayerToPlayerUpdate,
  ServerToClientEvents,
  TeleportInviteSingular,
  TownJoinResponse,
} from '../types/CoveyTownSocket';
import { isConversationArea, isViewingArea } from '../types/TypeUtils';
import PlayerController from './PlayerController';
import TownController, { TownEvents } from './TownController';
import ViewingAreaController from './ViewingAreaController';

/**
 * Mocks the socket-io client constructor such that it will always return the same
 * mockSocket instance. Returns that mockSocket instance to the caller of this function,
 * allowing tests to make assertions about the messages emitted to the socket, and also to
 * simulate the receipt of events, @see getEventListener
 */
const mockSocket = mock<CoveyTownSocket>();
jest.mock('socket.io-client', () => {
  const actual = jest.requireActual('socket.io-client');
  return {
    ...actual,
    io: () => mockSocket,
  };
});

describe('TownController', () => {
  let mockLoginController: MockProxy<LoginController>;
  let userName: string;
  let townID: string;
  beforeAll(() => {
    mockLoginController = mock<LoginController>();
    process.env.REACT_APP_TOWNS_SERVICE_URL = 'test';
  });
  let testController: TownController;
  let playerTestData: MockedPlayer;
  let playerTestData2: MockedPlayer;
  let playerTestData3: MockedPlayer;
  const mockListeners = mock<TownEvents>();
  let player1Location: PlayerLocation;
  let player2Location: PlayerLocation;

  /**
   * Testing harness that mocks the arrival of an event from the CoveyTownSocket and expects that
   * a given listener is invoked, optionally with an expected listener parameter.
   *
   * Returns a mock listener callback that represents the listener under expectation
   *
   * @param receivedEvent
   * @param receivedParameter
   * @param listenerToExpect
   * @param expectedListenerParam
   * @returns mock listener mock
   */
  const emitEventAndExpectListenerFiring = <
    ReceivedEventFromSocket extends EventNames<ServerToClientEvents>,
    ExpectedListenerName extends EventNames<TownEvents>,
  >(
    receivedEvent: ReceivedEventFromSocket,
    receivedParameter: ReceivedEventParameter<ReceivedEventFromSocket>,
    listenerToExpect: ExpectedListenerName,
    expectedListenerParam?: Parameters<TownEvents[ExpectedListenerName]>[0],
  ): jest.MockedFunction<TownEvents[ExpectedListenerName]> => {
    const eventListener = getEventListener(mockSocket, receivedEvent);
    const mockListener = jest.fn() as jest.MockedFunction<TownEvents[ExpectedListenerName]>;
    testController.addListener(listenerToExpect, mockListener);
    eventListener(receivedParameter);
    if (expectedListenerParam === undefined) {
      expect(mockListener).toHaveBeenCalled();
    } else {
      expect(mockListener).toHaveBeenCalledWith(expectedListenerParam);
    }
    return mockListener;
  };

  beforeEach(() => {
    mockClear(mockSocket);
    userName = nanoid();
    townID = nanoid();
    testController = new TownController({ userName, townID, loginController: mockLoginController });
    playerTestData = mockPlayer(townID);
    playerTestData2 = mockPlayer(townID);
    playerTestData3 = mockPlayer(townID);
    playerTestData.userName = 'player1';
    playerTestData2.userName = 'player2';
    playerTestData3.userName = 'player3';
    playerTestData.id = '003';
    playerTestData2.id = '004';
    playerTestData3.id = '005';
  });
  describe('Setting the conversation area invites property', () => {
    let teleportInvite1: TeleportInviteSingular;
    let teleportInvite2: TeleportInviteSingular;
    let newInvites: TeleportInviteSingular[];
    beforeEach(() => {
      player1Location = { x: 0, y: 0, rotation: 'back', moving: false };
      player2Location = { x: 1, y: 1, rotation: 'front', moving: false };
      teleportInvite1 = {
        requester: playerTestData.id,
        requested: playerTestData3.id,
        requesterLocation: player1Location,
      };
      teleportInvite2 = {
        requester: playerTestData2.id,
        requested: playerTestData3.id,
        requesterLocation: player2Location,
      };
      newInvites = [teleportInvite1, teleportInvite2];
      mockClear(mockListeners.conversationAreaInvitesChanged);
      testController.addListener(
        'conversationAreaInvitesChanged',
        mockListeners.conversationAreaInvitesChanged,
      );
    });
    it('does not update if the new conv area invites are the same as the old', () => {
      expect(testController.conversationAreaInvites).toEqual([]);
      testController.conversationAreaInvites = newInvites;
      expect(testController.conversationAreaInvites).toEqual(newInvites);
      testController.conversationAreaInvites = [teleportInvite2, teleportInvite1];
      expect(mockListeners.conversationAreaInvitesChanged).toBeCalledTimes(1);
    });
    it('emits the conversationAreaInvitesChanged event when setting and updates the param', () => {
      expect(testController.conversationAreaInvites).toEqual([]);
      testController.conversationAreaInvites = newInvites;
      expect(testController.conversationAreaInvites).toEqual(newInvites);
      expect(mockListeners.conversationAreaInvitesChanged).toBeCalledTimes(1);
      expect(mockListeners.conversationAreaInvitesChanged).toBeCalledWith(newInvites);
    });
  });
  describe('Setting the friend requests property', () => {
    let request1: PlayerToPlayerUpdate;
    let request2: PlayerToPlayerUpdate;
    let newFriendRequests: PlayerToPlayerUpdate[];
    beforeEach(() => {
      request1 = {
        actor: playerTestData.id,
        affected: playerTestData3.id,
      };
      request2 = {
        actor: playerTestData3.id,
        affected: playerTestData2.id,
      };
      newFriendRequests = [request1, request2];
      mockClear(mockListeners.playerFriendRequestsChanged);
      testController.addListener(
        'playerFriendRequestsChanged',
        mockListeners.playerFriendRequestsChanged,
      );
    });
    it('does not update if the new friend requests param is the same as the old', () => {
      expect(testController.playerFriendRequests).toEqual([]);
      testController.playerFriendRequests = newFriendRequests;
      expect(testController.playerFriendRequests).toEqual(newFriendRequests);
      testController.playerFriendRequests = [request2, request1];
      expect(mockListeners.playerFriendRequestsChanged).toBeCalledTimes(1);
    });
    it('emits the playerFriendRequestsChanged event when setting and updates the param', () => {
      expect(testController.playerFriendRequests).toEqual([]);
      testController.playerFriendRequests = newFriendRequests;
      expect(testController.playerFriendRequests).toEqual(newFriendRequests);
      expect(mockListeners.playerFriendRequestsChanged).toBeCalledTimes(1);
      expect(mockListeners.playerFriendRequestsChanged).toBeCalledWith(newFriendRequests);
    });
  });
  describe('Setting the player friends property', () => {
    let testPlayer: PlayerModel;
    let testPlayer2: PlayerModel;
    // Sets up two testPlayers to become friends with each other as well as clearing the mock listeners
    // that are set up to catch the 'playerFriendsChanged' events.
    beforeEach(() => {
      testPlayer = {
        id: nanoid(),
        location: { moving: false, rotation: 'back', x: 0, y: 1, interactableID: nanoid() },
        userName: nanoid(),
      };
      testPlayer2 = {
        id: nanoid(),
        location: { moving: false, rotation: 'back', x: 0, y: 1, interactableID: nanoid() },
        userName: nanoid(),
      };
      mockClear(mockListeners.playerFriendsChanged);
      testController.addListener('playerFriendsChanged', mockListeners.playerFriendsChanged);
    });
    it('does not update if the new friends param is the same as the old and empty', () => {
      expect(testController.playerFriends).toEqual([]);
      testController.playerFriends = [];
      expect(mockListeners.playerFriendsChanged).toBeCalledTimes(0);
    });
    it('does not update if the new friends param is the same as the old and non-empty', () => {
      expect(testController.playerFriends).toEqual([]);
      const testSamePlayer = PlayerController.fromPlayerModel(testPlayer);
      const testSamePlayer2 = PlayerController.fromPlayerModel(testPlayer2);
      testController.playerFriends = [testSamePlayer];
      expect(mockListeners.playerFriendsChanged).toBeCalledTimes(1);
      testController.playerFriends = [testSamePlayer];
      expect(mockListeners.playerFriendsChanged).toBeCalledTimes(1);
      testController.playerFriends = [testSamePlayer, testSamePlayer2];
      expect(mockListeners.playerFriendsChanged).toBeCalledTimes(2);
      testController.playerFriends = [testSamePlayer2, testSamePlayer];
      expect(mockListeners.playerFriendsChanged).toBeCalledTimes(2);
      expect(mockListeners.playerFriendsChanged).toHaveBeenCalledWith([testSamePlayer]);
      expect(mockListeners.playerFriendsChanged).toHaveBeenCalledWith([
        testSamePlayer,
        testSamePlayer2,
      ]);
    });
    it('emits a playerFriendsChanged when players are added and removed from the friends list', () => {
      expect(testController.playerFriends).toEqual([]);
      testController.playerFriends = [
        PlayerController.fromPlayerModel(testPlayer),
        PlayerController.fromPlayerModel(testPlayer2),
      ];
      expect(mockListeners.playerFriendsChanged).toBeCalledTimes(1);
      testController.playerFriends = [PlayerController.fromPlayerModel(testPlayer)];
      expect(mockListeners.playerFriendsChanged).toBeCalledTimes(2);
    });
  });
  describe('Setting the selected friends property', () => {
    let testPlayer: PlayerModel;
    let testPlayer2: PlayerModel;
    let testPlayerController1: PlayerController;
    let testPlayerController2: PlayerController;
    // Sets up two testPlayers to become friends with each other as well as clearing the mock listeners
    // that are set up to catch the 'playerFriendsChanged' events.
    beforeEach(() => {
      testPlayer = {
        id: nanoid(),
        location: { moving: false, rotation: 'back', x: 10, y: 12, interactableID: nanoid() },
        userName: nanoid(),
      };
      testPlayer2 = {
        id: nanoid(),
        location: { moving: false, rotation: 'back', x: 0, y: 1, interactableID: nanoid() },
        userName: nanoid(),
      };
      testPlayerController1 = PlayerController.fromPlayerModel(testPlayer);
      testPlayerController2 = PlayerController.fromPlayerModel(testPlayer2);
      testController.selectedFriends = [];
      mockClear(mockListeners.selectedFriendsChanged);
      testController.addListener('selectedFriendsChanged', mockListeners.selectedFriendsChanged);
    });
    it('does not update if the new selectedFriends param is the same as the old and empty', () => {
      // no selected friends
      expect(testController.selectedFriends).toEqual([]);
      // update to another empty list
      testController.selectedFriends = [];
      // no emit
      expect(mockListeners.selectedFriendsChanged).toBeCalledTimes(0);
    });
    it('does not update if the new selectedFriends param is the same as the old and non-empty', () => {
      // empty selectedFriends list
      expect(testController.selectedFriends).toEqual([]);
      // select player1
      testController.selectedFriends = [testPlayerController1];
      // should be called once
      expect(mockListeners.selectedFriendsChanged).toBeCalledTimes(1);
      expect(mockListeners.selectedFriendsChanged).toHaveBeenCalledWith([testPlayerController1]);

      // update with same list
      testController.selectedFriends = [testPlayerController1];

      // should have no more calls
      expect(mockListeners.selectedFriendsChanged).toBeCalledTimes(1);

      // new update
      testController.selectedFriends = [testPlayerController1, testPlayerController2];

      // one more emit
      expect(mockListeners.selectedFriendsChanged).toBeCalledTimes(2);
      expect(mockListeners.selectedFriendsChanged).toHaveBeenCalledWith([
        testPlayerController1,
        testPlayerController2,
      ]);

      // update selected friends with same items different order
      testController.selectedFriends = [testPlayerController2, testPlayerController1];

      // no more emits
      expect(mockListeners.selectedFriendsChanged).toBeCalledTimes(2);
    });
    it('emits a selectedPlayerFriends when players are added and removed from the friends list', () => {
      // empty list
      expect(testController.selectedFriends).toEqual([]);
      // update with both friends
      testController.selectedFriends = [testPlayerController1, testPlayerController2];
      expect(mockListeners.selectedFriendsChanged).toBeCalledTimes(1);

      // update to remove one friend
      testController.selectedFriends = [testPlayerController1];
      expect(mockListeners.selectedFriendsChanged).toBeCalledTimes(2);
    });
    describe('selectFriend function', () => {
      it('emits a selectedPlayerFriends when a new PlayerController is given', () => {
        expect(mockListeners.selectedFriendsChanged).not.toBeCalled();

        // select one friend
        testController.selectFriend(testPlayerController1);
        expect(mockListeners.selectedFriendsChanged).toBeCalledWith([testPlayerController1]);

        // select other friend
        testController.selectFriend(testPlayerController2);
        expect(mockListeners.selectedFriendsChanged).toBeCalledWith([
          testPlayerController1,
          testPlayerController2,
        ]);
      });
      it('doesnt emit a selectedPlayerFriends when a PlayerController that is already selected is given', () => {
        expect(mockListeners.selectedFriendsChanged).not.toBeCalled();

        // select one friend
        testController.selectFriend(testPlayerController1);
        expect(mockListeners.selectedFriendsChanged).toBeCalledTimes(1);

        // select same friend and expect no more emits
        testController.selectFriend(testPlayerController1);
        expect(mockListeners.selectedFriendsChanged).toBeCalledTimes(1);
      });
      it('updates the list of selected friends when a new PC is given', () => {
        expect(testController.selectedFriends).toEqual([]);

        // select one and expect updated list
        testController.selectFriend(testPlayerController1);
        expect(testController.selectedFriends).toEqual([testPlayerController1]);

        // select second friend and expect updated list
        testController.selectFriend(testPlayerController2);
        expect(testController.selectedFriends).toEqual([
          testPlayerController1,
          testPlayerController2,
        ]);
      });
      it('doesnt change the list of selected friends when an already selected PC is given', () => {
        expect(testController.selectedFriends).toEqual([]);

        // select friend 1
        testController.selectFriend(testPlayerController1);
        expect(testController.selectedFriends).toEqual([testPlayerController1]);

        // select friend 1 again
        testController.selectFriend(testPlayerController1);
        expect(testController.selectedFriends).toEqual([testPlayerController1]);
      });
    });
    describe('deselectFriend function', () => {
      it('emits a selectedPlayerFriends when a PlayerController that was already selected is given', () => {
        // select two friends
        testController.selectFriend(testPlayerController1);
        testController.selectFriend(testPlayerController2);
        expect(mockListeners.selectedFriendsChanged).toBeCalledTimes(2);

        // deselect one friend
        testController.deselectFriend(testPlayerController1);
        expect(mockListeners.selectedFriendsChanged).toBeCalledWith([testPlayerController2]);
        // deselect other friend
        testController.deselectFriend(testPlayerController2);
        expect(mockListeners.selectedFriendsChanged).toBeCalledWith([]);
      });
      it('doesnt emit a selectedPlayerFriends when a PlayerController that isnt already selected is given', () => {
        // select one friend
        testController.selectFriend(testPlayerController1);
        expect(mockListeners.selectedFriendsChanged).toBeCalledTimes(1);

        // deselect a non-selected friend
        testController.deselectFriend(testPlayerController2);
        expect(mockListeners.selectedFriendsChanged).toBeCalledTimes(1);

        // deslect the selected friend
        testController.deselectFriend(testPlayerController1);
        // it should emit
        expect(mockListeners.selectedFriendsChanged).toBeCalledTimes(2);

        // try to deslect the friend again
        testController.deselectFriend(testPlayerController1);
        // it shouldn't emit anything
        expect(mockListeners.selectedFriendsChanged).toBeCalledTimes(2);
      });
      it('updates the list of selected friends when an already selected PC is given', () => {
        // select two friends
        testController.selectFriend(testPlayerController1);
        testController.selectFriend(testPlayerController2);
        expect(testController.selectedFriends).toEqual([
          testPlayerController1,
          testPlayerController2,
        ]);

        // deselect one friend
        testController.deselectFriend(testPlayerController1);
        expect(testController.selectedFriends).toEqual([testPlayerController2]);
        // deselect other friend
        testController.deselectFriend(testPlayerController2);
        expect(testController.selectedFriends).toEqual([]);
      });
      it('doesnt change the list of selected friends when a non-selected PC is given', () => {
        // select one friend
        testController.selectFriend(testPlayerController1);
        expect(testController.selectedFriends).toEqual([testPlayerController1]);

        // deselect a non-selected friend
        testController.deselectFriend(testPlayerController2);
        expect(testController.selectedFriends).toEqual([testPlayerController1]);

        // deslect the selected friend
        testController.deselectFriend(testPlayerController1);
        // it should update
        expect(testController.selectedFriends).toEqual([]);

        // try to deslect the friend again
        testController.deselectFriend(testPlayerController1);
        // it shouldn't change
        expect(testController.selectedFriends).toEqual([]);
      });
    });
  });
  describe('With an unsuccesful connection', () => {
    it('Throws an error', async () => {
      mockSocket.on.mockImplementation((eventName, eventListener) => {
        if (eventName === 'disconnect') {
          const listener = eventListener as () => void;
          listener();
        }
        return mockSocket;
      });
      await expect(testController.connect()).rejects.toThrowError();
      mockSocket.on.mockReset();
    });
  });
  describe('With a successful connection', () => {
    let townJoinResponse: TownJoinResponse;

    beforeEach(async () => {
      townJoinResponse = await mockTownControllerConnection(testController, mockSocket);
    });
    it('Initializes the properties of the controller', () => {
      expect(testController.providerVideoToken).toEqual(townJoinResponse.providerVideoToken);
      expect(testController.friendlyName).toEqual(townJoinResponse.friendlyName);
      expect(testController.townIsPubliclyListed).toEqual(townJoinResponse.isPubliclyListed);
      expect(testController.sessionToken).toEqual(townJoinResponse.sessionToken);
      expect(testController.userID).toEqual(townJoinResponse.userID);
    });

    it('Forwards update town calls to local CoveyTownEvents listeners', () => {
      const newFriendlyName = nanoid();
      emitEventAndExpectListenerFiring(
        'townSettingsUpdated',
        { friendlyName: newFriendlyName },
        'townSettingsUpdated',
        { friendlyName: newFriendlyName },
      );
    });
    it('Forwards delete town calls to local CoveyTownEvents listeners', () => {
      emitEventAndExpectListenerFiring('townClosing', undefined, 'disconnect', undefined);
    });
    it('Forwards chat messages to local CoveyTownEvents listeners', () => {
      const message: ChatMessage = {
        author: nanoid(),
        body: nanoid(),
        dateCreated: new Date(),
        sid: nanoid(),
      };
      emitEventAndExpectListenerFiring('chatMessage', message, 'chatMessage', message);
    });
    it('Emits a sendMiniMessage event when clickedSendMiniMessage is called', () => {
      const testMessage: MiniMessage = {
        sender: '001',
        recipients: ['002'],
        body: nanoid(),
      };
      testController.clickedSendMiniMessage(testMessage);
      expect(mockSocket.emit).toBeCalledWith('sendMiniMessage', testMessage);
    });
    it("Emits the local player's movement updates to the socket and to locally subscribed CoveyTownEvents listeners", () => {
      const newLocation: PlayerLocation = { ...testController.ourPlayer.location, x: 10, y: 10 };
      const expectedPlayerUpdate = testController.ourPlayer;
      expectedPlayerUpdate.location = newLocation;
      const movedPlayerListener = jest.fn();

      testController.addListener('playerMoved', movedPlayerListener);

      testController.emitMovement(newLocation);

      //Emits the event to the socket
      expect(mockSocket.emit).toBeCalledWith('playerMovement', newLocation);

      //Emits the playerMovement event to locally subscribed listerners, indicating that the player moved
      expect(movedPlayerListener).toBeCalledWith(expectedPlayerUpdate);

      //Uses the correct (new) location when emitting that update locally
      expect(expectedPlayerUpdate.location).toEqual(newLocation);
    });
    it('Emits locally written chat messages to the socket, and dispatches no other events', () => {
      const testMessage: ChatMessage = {
        author: nanoid(),
        body: nanoid(),
        dateCreated: new Date(),
        sid: nanoid(),
      };
      testController.emitChatMessage(testMessage);

      expect(mockSocket.emit).toBeCalledWith('chatMessage', testMessage);
    });
    it('Emits conversationAreasChanged when a conversation area is created', () => {
      const newConvArea = townJoinResponse.interactables.find(
        eachInteractable => isConversationArea(eachInteractable) && !eachInteractable.topic,
      ) as ConversationAreaModel;
      if (newConvArea) {
        newConvArea.topic = nanoid();
        newConvArea.occupantsByID = [townJoinResponse.userID];
        const event = emitEventAndExpectListenerFiring(
          'interactableUpdate',
          newConvArea,
          'conversationAreasChanged',
        );
        const changedAreasArray = event.mock.calls[0][0];
        expect(changedAreasArray.find(eachConvArea => eachConvArea.id === newConvArea.id)?.topic);
      } else {
        fail('Did not find an existing, empty conversation area in the town join response');
      }
    });
    it('Emits acceptFriendRequest when clickedAcceptFriendRequest is called', () => {
      const testRequest: PlayerToPlayerUpdate = {
        actor: playerTestData.id,
        affected: playerTestData2.id,
      };
      testController.clickedAcceptFriendRequest(testRequest);
      expect(mockSocket.emit).toBeCalledWith('acceptFriendRequest', testRequest);
    });
    it('Emits declineFriendRequest when clickedDeclineFriendRequest is called', () => {
      const testRequest: PlayerToPlayerUpdate = {
        actor: playerTestData.id,
        affected: playerTestData2.id,
      };
      testController.clickedDeclineFriendRequest(testRequest);
      expect(mockSocket.emit).toBeCalledWith('declineFriendRequest', testRequest);
    });
    it('Emits sendFriendRequest event when clickedSendFriendRequest is called', () => {
      const testRequest: PlayerToPlayerUpdate = {
        actor: playerTestData.id,
        affected: playerTestData2.id,
      };
      testController.clickedSendRequest(testRequest);
      expect(mockSocket.emit).toBeCalledWith('sendFriendRequest', testRequest);
    });
    it('Emits cancelFriendRequest event when clickedCancelFriendRequest is called', () => {
      const testRequest: PlayerToPlayerUpdate = {
        actor: playerTestData.id,
        affected: playerTestData2.id,
      };
      testController.clickedCancelRequest(testRequest);
      expect(mockSocket.emit).toBeCalledWith('cancelFriendRequest', testRequest);
    });
    it('Emits a playerMovement when clickedTeleportToFriend is called', () => {
      const testPlayerLocation: PlayerLocation = {
        moving: false,
        rotation: 'back',
        x: 0,
        y: 1,
        interactableID: nanoid(),
      };
      testController.clickedTeleportToFriend(testPlayerLocation);
      expect(mockSocket.emit).toBeCalledWith('playerMovement', testPlayerLocation);
    });
    it('Emits removeFriend when clickedRemoveFriend is called', () => {
      const testRemoveFriend: PlayerToPlayerUpdate = {
        actor: playerTestData.id,
        affected: playerTestData2.id,
      };
      testController.clickedRemoveFriend(testRemoveFriend);
      expect(mockSocket.emit).toBeCalledWith('removeFriend', testRemoveFriend);
    });
    it('Does not emit inviteAllToConvArea when clickedInviteAllToConvArea is called and the requesting player is not in a conversation area', () => {
      const testInvite: ConversationAreaGroupInvite = {
        requester: playerTestData.id,
        requested: [playerTestData2.id],
        requesterLocation: player1Location,
      };
      testController.clickedInviteAllToConvArea(testInvite);
      expect(mockSocket.emit).not.toBeCalled();
    });
    it('Emits inviteAllToConvArea when clickedInviteAllToConvArea is called and the requesting player is in a conversation area', () => {
      testController.conversationAreas[0].occupants.push(
        PlayerController.fromPlayerModel({
          id: playerTestData.id,
          userName: playerTestData.userName,
          location: player1Location,
        }),
      );
      const testInvite: ConversationAreaGroupInvite = {
        requester: playerTestData.id,
        requested: [playerTestData2.id],
        requesterLocation: player1Location,
      };
      testController.clickedInviteAllToConvArea(testInvite);
      expect(mockSocket.emit).toBeCalledWith('inviteAllToConvArea', testInvite);
    });
    it('Emits acceptConvAreaInvite when clickedAcceptConvAreaInvite is called', () => {
      const testInvite: TeleportInviteSingular = {
        requester: playerTestData.id,
        requested: playerTestData2.id,
        requesterLocation: { x: 0, y: 0, rotation: 'back', moving: false },
      };
      testController.clickedAcceptConvAreaInvite(testInvite);
      expect(mockSocket.emit).toBeCalledWith('acceptConvAreaInvite', testInvite);
    });
    it('Emits declineConvAreaInvite when clickedDeclineConvAreaInvite is called', () => {
      const testInvite: TeleportInviteSingular = {
        requester: playerTestData.id,
        requested: playerTestData2.id,
        requesterLocation: { x: 0, y: 0, rotation: 'back', moving: false },
      };
      testController.clickedDeclineConvAreaInvite(testInvite);
      expect(mockSocket.emit).toBeCalledWith('declineConvAreaInvite', testInvite);
    });
    describe('[T2] interactableUpdate events', () => {
      describe('Conversation Area updates', () => {
        function emptyConversationArea() {
          return {
            ...(townJoinResponse.interactables.find(
              eachInteractable =>
                isConversationArea(eachInteractable) && eachInteractable.occupantsByID.length == 0,
            ) as ConversationAreaModel),
          };
        }
        function occupiedConversationArea() {
          return {
            ...(townJoinResponse.interactables.find(
              eachInteractable =>
                isConversationArea(eachInteractable) && eachInteractable.occupantsByID.length > 0,
            ) as ConversationAreaModel),
          };
        }
        it('Emits a conversationAreasChanged event with the updated list of conversation areas if the area is newly occupied', () => {
          const convArea = emptyConversationArea();
          convArea.occupantsByID = [townJoinResponse.userID];
          convArea.topic = nanoid();
          const updatedConversationAreas = testController.conversationAreas;

          emitEventAndExpectListenerFiring(
            'interactableUpdate',
            convArea,
            'conversationAreasChanged',
            updatedConversationAreas,
          );

          const updatedController = updatedConversationAreas.find(
            eachArea => eachArea.id === convArea.id,
          );
          expect(updatedController?.topic).toEqual(convArea.topic);
          expect(updatedController?.occupants.map(eachOccupant => eachOccupant.id)).toEqual(
            convArea.occupantsByID,
          );
          expect(updatedController?.toConversationAreaModel()).toEqual({
            id: convArea.id,
            topic: convArea.topic,
            occupantsByID: [townJoinResponse.userID],
          });
        });
        it('Emits a conversationAreasChanged event with the updated list of converation areas if the area is newly vacant', () => {
          const convArea = occupiedConversationArea();
          convArea.occupantsByID = [];
          convArea.topic = undefined;
          const updatedConversationAreas = testController.conversationAreas;

          emitEventAndExpectListenerFiring(
            'interactableUpdate',
            convArea,
            'conversationAreasChanged',
            updatedConversationAreas,
          );
          const updatedController = updatedConversationAreas.find(
            eachArea => eachArea.id === convArea.id,
          );
          expect(updatedController?.topic).toEqual(convArea.topic);
          expect(updatedController?.occupants.map(eachOccupant => eachOccupant.id)).toEqual(
            convArea.occupantsByID,
          );
        });
        it('Does not emit a conversationAreasChanged event if the set of active areas has not changed', () => {
          const convArea = occupiedConversationArea();
          convArea.topic = nanoid();
          const updatedConversationAreas = testController.conversationAreas;

          const eventListener = getEventListener(mockSocket, 'interactableUpdate');
          const mockListener = jest.fn() as jest.MockedFunction<
            TownEvents['conversationAreasChanged']
          >;
          testController.addListener('conversationAreasChanged', mockListener);
          eventListener(convArea);
          expect(mockListener).not.toBeCalled();

          const updatedController = updatedConversationAreas.find(
            eachArea => eachArea.id === convArea.id,
          );
          expect(updatedController?.topic).toEqual(convArea.topic);
          expect(updatedController?.occupants.map(eachOccupant => eachOccupant.id)).toEqual(
            convArea.occupantsByID,
          );
        });
        it('Emits a topicChange event if the topic of a conversation area changes', () => {
          const convArea = occupiedConversationArea();
          convArea.topic = nanoid();
          //Set up a topicChange listener
          const topicChangeListener = jest.fn();
          const convAreaController = testController.conversationAreas.find(
            eachArea => eachArea.id === convArea.id,
          );
          if (!convAreaController) {
            fail('Could not find conversation area controller');
            return;
          }
          convAreaController.addListener('topicChange', topicChangeListener);

          // Perform the update
          const eventListener = getEventListener(mockSocket, 'interactableUpdate');
          eventListener(convArea);

          expect(topicChangeListener).toBeCalledWith(convArea.topic);
        });
        it('Does not emit a topicChange event if the topic is unchanged', () => {
          const convArea = occupiedConversationArea();
          //Set up a topicChange listener
          const topicChangeListener = jest.fn();
          const convAreaController = testController.conversationAreas.find(
            eachArea => eachArea.id === convArea.id,
          );
          if (!convAreaController) {
            fail('Could not find conversation area controller');
          }
          convAreaController.addListener('topicChange', topicChangeListener);

          // Perform the update
          const eventListener = getEventListener(mockSocket, 'interactableUpdate');
          eventListener(convArea);

          expect(topicChangeListener).not.toBeCalled();
        });
        it('Emits an occupantsChange event if the occupants changed', () => {
          const convArea = occupiedConversationArea();
          convArea.occupantsByID = [townJoinResponse.userID, townJoinResponse.currentPlayers[1].id];

          //Set up an occupantsChange listener
          const occupantsChangeListener = jest.fn();
          const convAreaController = testController.conversationAreas.find(
            eachArea => eachArea.id === convArea.id,
          );
          if (!convAreaController) {
            fail('Could not find conversation area controller');
          }
          convAreaController.addListener('occupantsChange', occupantsChangeListener);

          // Perform the update
          const eventListener = getEventListener(mockSocket, 'interactableUpdate');
          eventListener(convArea);

          expect(occupantsChangeListener).toBeCalledTimes(1);
        });
        it('Does not emit an occupantsChange if the occupants have not changed', () => {
          const convArea = occupiedConversationArea();
          convArea.topic = nanoid();

          //Set up an occupantsChange listener
          const occupantsChangeListener = jest.fn();
          const convAreaController = testController.conversationAreas.find(
            eachArea => eachArea.id === convArea.id,
          );
          if (!convAreaController) {
            fail('Could not find conversation area controller');
          }
          convAreaController.addListener('occupantsChange', occupantsChangeListener);

          // Perform the update
          const eventListener = getEventListener(mockSocket, 'interactableUpdate');
          eventListener(convArea);

          expect(occupantsChangeListener).not.toBeCalled();
        });
      });
      describe('Viewing Area updates', () => {
        function viewingAreaOnTown() {
          return {
            ...(townJoinResponse.interactables.find(eachInteractable =>
              isViewingArea(eachInteractable),
            ) as ViewingArea),
          };
        }
        let viewingArea: ViewingArea;
        let viewingAreaController: ViewingAreaController;
        let eventListener: (update: ViewingArea) => void;
        beforeEach(() => {
          viewingArea = viewingAreaOnTown();
          const controller = testController.viewingAreas.find(
            eachArea => eachArea.id === viewingArea.id,
          );
          if (!controller) {
            fail(`Could not find viewing area controller for viewing area ${viewingArea.id}`);
          }
          viewingAreaController = controller;
          eventListener = getEventListener(mockSocket, 'interactableUpdate');
        });
        it('Updates the viewing area model', () => {
          viewingArea.video = nanoid();
          viewingArea.elapsedTimeSec++;
          viewingArea.isPlaying = !viewingArea.isPlaying;

          eventListener(viewingArea);

          expect(viewingAreaController.viewingAreaModel()).toEqual(viewingArea);
        });
        it('Emits a playbackChange event if isPlaying changes', () => {
          const listener = jest.fn();
          viewingAreaController.addListener('playbackChange', listener);

          viewingArea.isPlaying = !viewingArea.isPlaying;
          eventListener(viewingArea);
          expect(listener).toBeCalledWith(viewingArea.isPlaying);
        });
        it('Emits a progressChange event if the elapsedTimeSec chagnes', () => {
          const listener = jest.fn();
          viewingAreaController.addListener('progressChange', listener);

          viewingArea.elapsedTimeSec++;
          eventListener(viewingArea);
          expect(listener).toBeCalledWith(viewingArea.elapsedTimeSec);
        });
        it('Emits a videoChange event if the video changes', () => {
          const listener = jest.fn();
          viewingAreaController.addListener('videoChange', listener);

          viewingArea.video = nanoid();
          eventListener(viewingArea);
          expect(listener).toBeCalledWith(viewingArea.video);
        });
      });
    });
    describe('Friend events', () => {
      // declare event listeners for each of the 5 friend related events
      let friendRequestSentEventListener: (update: PlayerToPlayerUpdate) => void;
      let friendRequestDeclinedEventListener: (update: PlayerToPlayerUpdate) => void;
      let friendRequestAcceptedEventListener: (update: PlayerToPlayerUpdate) => void;
      let friendRequestCanceledListener: (update: PlayerToPlayerUpdate) => void;
      let friendRemovedEventListener: (update: PlayerToPlayerUpdate) => void;

      // declare two PlayerToPlayerUpdates that will be used
      let updateFromOurPlayerToPlayer2: PlayerToPlayerUpdate;
      let updateFromPlayer2ToOurPlayer: PlayerToPlayerUpdate;
      beforeEach(() => {
        // define/get the eventListeners for each friend related event
        // can be used to mock receiving their corresponding events
        friendRequestSentEventListener = getEventListener(mockSocket, 'friendRequestSent');
        friendRequestDeclinedEventListener = getEventListener(mockSocket, 'friendRequestDeclined');
        friendRequestAcceptedEventListener = getEventListener(mockSocket, 'friendRequestAccepted');
        friendRequestCanceledListener = getEventListener(mockSocket, 'friendRequestCanceled');
        friendRemovedEventListener = getEventListener(mockSocket, 'friendRemoved');

        // clear and add mock listeners for playerFriendRequestsChanged events
        mockClear(mockListeners.playerFriendRequestsChanged);
        testController.addListener(
          'playerFriendRequestsChanged',
          mockListeners.playerFriendRequestsChanged,
        );

        // clear and add mock listeners for playerFriendsChanged events
        mockClear(mockListeners.playerFriendsChanged);
        testController.addListener('playerFriendsChanged', mockListeners.playerFriendsChanged);

        // create a P2PUpdate with testController.ourPlayer as actor and playerTestData2 as affected
        updateFromOurPlayerToPlayer2 = {
          actor: testController.ourPlayer.id,
          affected: playerTestData2.id,
        };
        // create a P2PUpdate with playerTestData2 as actor and testController.ourPlayer as affected
        updateFromPlayer2ToOurPlayer = {
          actor: playerTestData2.id,
          affected: testController.ourPlayer.id,
        };
      });
      describe('friendRequestSent events', () => {
        it('Emits a playerFriendRequestsChanged event with the updated list of friend requests', () => {
          // send a request from our player to player2
          friendRequestSentEventListener(updateFromOurPlayerToPlayer2);

          // exepct to see it in the playerFriendRequestsChanged emit
          expect(mockListeners.playerFriendRequestsChanged).toBeCalledWith([
            updateFromOurPlayerToPlayer2,
          ]);
        });
        it('Does not emit a playerFriendsChanged event', () => {
          // send a request from our player to player2
          friendRequestSentEventListener(updateFromOurPlayerToPlayer2);
          // expect NO playerFriendsChange
          expect(mockListeners.playerFriendsChanged).not.toBeCalled();
        });
        it('Updates the controllers list of friend requests if we are the actor', () => {
          expect(testController.playerFriendRequests).toEqual([]);

          // send a request from our player to player2
          friendRequestSentEventListener(updateFromOurPlayerToPlayer2);

          // show the request in our playerFriendRequests
          expect(testController.playerFriendRequests).toEqual([updateFromOurPlayerToPlayer2]);
        });
        it('Updates the controllers list of friend requests if we are the affected', () => {
          expect(testController.playerFriendRequests).toEqual([]);

          // send a request from player2 to our player
          friendRequestSentEventListener(updateFromPlayer2ToOurPlayer);

          // show the request in our playerFriendRequests
          expect(testController.playerFriendRequests).toEqual([updateFromPlayer2ToOurPlayer]);
        });
        it('Does nothing if the request doesnt include ourPlayer', () => {
          const testRequest: PlayerToPlayerUpdate = {
            actor: playerTestData2.id,
            affected: playerTestData.id,
          };

          expect(testController.playerFriendRequests).toEqual([]);
          // send a request from player2 to player1
          friendRequestSentEventListener(testRequest);

          // don't store in our friend requests
          expect(testController.playerFriendRequests).toEqual([]);
          // we shouldn't emit a playerFriendRequestsChanged
          expect(mockListeners.playerFriendRequestsChanged).not.toBeCalled();
        });
      });
      describe('friendRequestDeclined events', () => {
        it('Emits a playerFriendRequestsChanged event with the updated list of friend requests', () => {
          // add friend request from our player to player 2
          friendRequestSentEventListener(updateFromOurPlayerToPlayer2);
          expect(mockListeners.playerFriendRequestsChanged).toBeCalledWith([
            updateFromOurPlayerToPlayer2,
          ]);

          // player2 declines the request
          friendRequestDeclinedEventListener(updateFromPlayer2ToOurPlayer);
          // expect a playerFrinedRequestsChanged event to be emitted
          expect(mockListeners.playerFriendRequestsChanged).toBeCalledWith([]);
        });
        it('Does not emit a playerFriendsChanged event', () => {
          // add friend request from our player to player 2
          friendRequestSentEventListener(updateFromOurPlayerToPlayer2);
          expect(mockListeners.playerFriendRequestsChanged).toBeCalledWith([
            updateFromOurPlayerToPlayer2,
          ]);

          // player2 declines the request
          friendRequestDeclinedEventListener(updateFromPlayer2ToOurPlayer);
          // expect NO playerFriendsChanged event to be emitted
          expect(mockListeners.playerFriendRequestsChanged).toBeCalledWith([]);
          expect(mockListeners.playerFriendsChanged).not.toBeCalled();
        });
        it('Updates the controllers list of friend requests if we are the actor', () => {
          // add friend request from player2 to our player
          friendRequestSentEventListener(updateFromPlayer2ToOurPlayer);
          expect(testController.playerFriendRequests).toEqual([updateFromPlayer2ToOurPlayer]);

          // ourPlayer declines the request
          friendRequestDeclinedEventListener(updateFromOurPlayerToPlayer2);
          // expect the request to be removed from testController's friend requests
          expect(testController.playerFriendRequests).toEqual([]);
        });
        it('Updates the controllers list of friend requests if we are the affected', () => {
          // add friend request from our player to player 2
          friendRequestSentEventListener(updateFromOurPlayerToPlayer2);
          expect(testController.playerFriendRequests).toEqual([updateFromOurPlayerToPlayer2]);

          // player2 declines the request
          friendRequestDeclinedEventListener(updateFromPlayer2ToOurPlayer);
          // expect the request to be removed from testController's friend requests
          expect(testController.playerFriendRequests).toEqual([]);
        });
        it('Does nothing if the request doesnt include ourPlayer', () => {
          const testRequest: PlayerToPlayerUpdate = {
            actor: playerTestData2.id,
            affected: playerTestData.id,
          };
          const testDecline: PlayerToPlayerUpdate = {
            actor: playerTestData.id,
            affected: playerTestData2.id,
          };

          // expect our stored friend requests to remain empty
          expect(testController.playerFriendRequests).toEqual([]);
          // send a request from player 2 to player 1
          friendRequestSentEventListener(testRequest);
          expect(testController.playerFriendRequests).toEqual([]);
          // player 2 declines the request
          friendRequestDeclinedEventListener(testDecline);
          expect(testController.playerFriendRequests).toEqual([]);

          expect(mockListeners.playerFriendRequestsChanged).not.toBeCalled();
        });
      });
      describe('friendRequestAccepted events', () => {
        let player1ToOurPlayer: PlayerToPlayerUpdate;
        let ourPlayerToPlayer2: PlayerToPlayerUpdate;
        let ourPlayerAcceptPlayer1: PlayerToPlayerUpdate;
        let player2AcceptOurPlayer: PlayerToPlayerUpdate;
        let player1PC: PlayerController;
        let player2PC: PlayerController;
        beforeEach(() => {
          // Add relevant players
          player1PC = new PlayerController('id1', 'player1', {
            x: 0,
            y: 0,
            rotation: 'front',
            moving: true,
          });
          player2PC = new PlayerController('id2', 'player2', {
            x: 10,
            y: 10,
            rotation: 'front',
            moving: false,
          });
          testController.players = [player1PC, player2PC];
          // Set up IDs
          playerTestData.id = 'id1';
          playerTestData2.id = 'id2';
          // creates a PlayerToPlayer update from playerTestData to the testController's ourPlayer
          player1ToOurPlayer = {
            actor: playerTestData.id,
            affected: testController.ourPlayer.id,
          };
          // creates a PlayerToPlayer update from the testController's ourPlayer to playerTestData2
          ourPlayerToPlayer2 = {
            actor: testController.ourPlayer.id,
            affected: playerTestData2.id,
          };
          // creates a PlayerToPlayer update from the testController's ourPlayer to playerTestData
          ourPlayerAcceptPlayer1 = {
            actor: testController.ourPlayer.id,
            affected: playerTestData.id,
          };
          // creates a PlayerToPlayer update from playerTestData2 to the testController's ourPlayer
          player2AcceptOurPlayer = {
            actor: playerTestData2.id,
            affected: testController.ourPlayer.id,
          };

          // set up two outgoing requests, one from player1 to our player and one from our player to player2
          friendRequestSentEventListener(player1ToOurPlayer);
          friendRequestSentEventListener(ourPlayerToPlayer2);
        });
        afterEach(() => {
          // clear testController's friends and requests
          testController.playerFriends = [];
          testController.playerFriendRequests = [];
        });
        it('Emits a playerFriendRequestsChanged event with the updated list of friend requests', () => {
          // check that the requests from the beforeEach are present
          expect(testController.playerFriendRequests).toEqual([
            player1ToOurPlayer,
            ourPlayerToPlayer2,
          ]);
          // ourPlayer accepts the request from player 1
          friendRequestAcceptedEventListener(ourPlayerAcceptPlayer1);
          // expect a playerFriendRequestsChanged to be emitted
          expect(mockListeners.playerFriendRequestsChanged).toBeCalledWith([ourPlayerToPlayer2]);
        });
        it('Emits a playerFriendsChanged event with the updated list of friends', () => {
          // check that the requests from the beforeEach are present
          expect(testController.playerFriendRequests).toEqual([
            player1ToOurPlayer,
            ourPlayerToPlayer2,
          ]);
          // ourPlayer accepts the request from player 1
          friendRequestAcceptedEventListener(ourPlayerAcceptPlayer1);
          // expect a playerFriendsChanged event with the updated friends list including player 1
          expect(mockListeners.playerFriendsChanged).toBeCalledWith([player1PC]);
        });
        it('Updates the controllers list of friend requests if we are the actor', () => {
          // check that the requests from the beforeEach are present
          expect(testController.playerFriendRequests).toEqual([
            player1ToOurPlayer,
            ourPlayerToPlayer2,
          ]);
          // ourPlayer accepts the request from player 1
          friendRequestAcceptedEventListener(ourPlayerAcceptPlayer1);
          // expect our friendRequestsList to have only the request outgoing request now
          expect(testController.playerFriendRequests).toEqual([ourPlayerToPlayer2]);
        });
        it('Updates the controllers list of friend requests if we are the affected', () => {
          // check that the requests from the beforeEach are present
          expect(testController.playerFriendRequests).toEqual([
            player1ToOurPlayer,
            ourPlayerToPlayer2,
          ]);
          // player 2 accepts the request from ourPlayer
          friendRequestAcceptedEventListener(player2AcceptOurPlayer);
          // expect ourPlayer's friend requests to only contain the incoming friend request
          expect(testController.playerFriendRequests).toEqual([player1ToOurPlayer]);
        });
        it('Updates the controllers list of friends if we are the actor', () => {
          expect(testController.playerFriends).toEqual([]);
          // ourPlayer accepts the request from player 1
          friendRequestAcceptedEventListener(ourPlayerAcceptPlayer1);
          // expect player 1 to be added to the testController's friends list
          expect(testController.playerFriends).toEqual([player1PC]);
        });
        it('Updates the controllers list of friends if we are the affected', () => {
          expect(testController.playerFriends).toEqual([]);
          // player 2 accepts the request from ourPlayer's
          friendRequestAcceptedEventListener(player2AcceptOurPlayer);
          // expect that player 2 is added to testController's friends list
          expect(testController.playerFriends).toEqual([player2PC]);
        });
        it('Does nothing if the request doesnt include ourPlayer', () => {
          // clear mock counts
          mockClear(mockListeners.playerFriendsChanged);
          mockClear(mockListeners.playerFriendRequestsChanged);

          // check our players, friends and friend requests before acting
          expect(testController.playerFriends).toEqual([]);
          expect(testController.playerFriendRequests).toEqual([
            player1ToOurPlayer,
            ourPlayerToPlayer2,
          ]);

          // player 1 accepts a request from player 2
          friendRequestAcceptedEventListener({
            actor: playerTestData.id,
            affected: playerTestData2.id,
          });

          // check our players, friends and friends requests haven't changed
          expect(testController.playerFriends).toEqual([]);
          expect(testController.playerFriendRequests).toEqual([
            player1ToOurPlayer,
            ourPlayerToPlayer2,
          ]);

          // check that our playerFriendRequestsChanged and playerFriendsChanged events were not emitted
          expect(mockListeners.playerFriendRequestsChanged).not.toBeCalled();
          expect(mockListeners.playerFriendsChanged).not.toBeCalled();
        });
      });
      describe('friendRequestCanceled events', () => {
        it('Emits a playerFriendRequestsChanged event with the updated list of friend requests', () => {
          // add friend request from our player to player 2
          friendRequestSentEventListener(updateFromOurPlayerToPlayer2);
          expect(mockListeners.playerFriendRequestsChanged).toBeCalledWith([
            updateFromOurPlayerToPlayer2,
          ]);

          // our player cancels the request
          friendRequestCanceledListener(updateFromOurPlayerToPlayer2);
          // expect playerFriendRequestsChanged event to be called
          expect(mockListeners.playerFriendRequestsChanged).toBeCalledWith([]);
        });
        it('Does not emit a playerFriendsChanged event', () => {
          // add friend request from our player to player 2
          friendRequestSentEventListener(updateFromOurPlayerToPlayer2);
          expect(mockListeners.playerFriendRequestsChanged).toBeCalledWith([
            updateFromOurPlayerToPlayer2,
          ]);

          // ourplayer cancels the request
          friendRequestCanceledListener(updateFromOurPlayerToPlayer2);
          // expect playerFriendsChanged not to be called
          expect(mockListeners.playerFriendRequestsChanged).toBeCalledWith([]);
          expect(mockListeners.playerFriendsChanged).not.toBeCalled();
        });
        it('Updates the controllers list of friend requests if we are the actor', () => {
          // add friend request from our player to player 2
          friendRequestSentEventListener(updateFromOurPlayerToPlayer2);
          expect(testController.playerFriendRequests).toEqual([updateFromOurPlayerToPlayer2]);

          // ourPlayer cancels the request
          friendRequestCanceledListener(updateFromOurPlayerToPlayer2);
          // expect playerFriendRequests to not have the original request
          expect(testController.playerFriendRequests).toEqual([]);
        });
        it('Updates the controllers list of friend requests if we are the affected', () => {
          // add friend request from player2 to our player
          friendRequestSentEventListener(updateFromPlayer2ToOurPlayer);
          expect(testController.playerFriendRequests).toEqual([updateFromPlayer2ToOurPlayer]);

          // player2 cancels the request
          friendRequestCanceledListener(updateFromPlayer2ToOurPlayer);
          // expect playerFriendRequests to not have the original request
          expect(testController.playerFriendRequests).toEqual([]);
        });
        it('Does nothing if the request doesnt include ourPlayer', () => {
          const testRequest: PlayerToPlayerUpdate = {
            actor: playerTestData2.id,
            affected: playerTestData.id,
          };

          // make sure we don't have any requests before, during, or after
          expect(testController.playerFriendRequests).toEqual([]);

          // send a request from player 2 to player 1
          friendRequestSentEventListener(testRequest);
          expect(testController.playerFriendRequests).toEqual([]);

          // player 2 cancels the outgoing request
          friendRequestCanceledListener(testRequest);
          expect(testController.playerFriendRequests).toEqual([]);

          // make sure our controller did not emit playerFriendRequestsChanged events
          expect(mockListeners.playerFriendRequestsChanged).not.toBeCalled();
        });
      });
      describe('friendRemoved events', () => {
        // declare P2PUpdates
        let player1ToOurPlayer: PlayerToPlayerUpdate;
        let ourPlayerToPlayer2: PlayerToPlayerUpdate;
        let ourPlayerAcceptPlayer1: PlayerToPlayerUpdate;
        let player2AcceptOurPlayer: PlayerToPlayerUpdate;
        let player1PC: PlayerController;
        let player2PC: PlayerController;
        beforeEach(() => {
          // Add relevant players
          player1PC = new PlayerController('id1', 'player1', {
            x: 0,
            y: 0,
            rotation: 'front',
            moving: true,
          });
          player2PC = new PlayerController('id2', 'player2', {
            x: 10,
            y: 10,
            rotation: 'front',
            moving: false,
          });
          testController.players = [player1PC, player2PC];
          // Set up IDs
          playerTestData.id = 'id1';
          playerTestData2.id = 'id2';
          // define the P2PUpdates
          player1ToOurPlayer = {
            actor: playerTestData.id,
            affected: testController.ourPlayer.id,
          };
          ourPlayerToPlayer2 = {
            actor: testController.ourPlayer.id,
            affected: playerTestData2.id,
          };
          ourPlayerAcceptPlayer1 = {
            actor: testController.ourPlayer.id,
            affected: playerTestData.id,
          };
          player2AcceptOurPlayer = {
            actor: playerTestData2.id,
            affected: testController.ourPlayer.id,
          };

          // send a request from player 1 to our player and from our player to player 2
          friendRequestSentEventListener(player1ToOurPlayer);
          friendRequestSentEventListener(ourPlayerToPlayer2);
          // accept both requests
          friendRequestAcceptedEventListener(ourPlayerAcceptPlayer1);
          friendRequestAcceptedEventListener(player2AcceptOurPlayer);
        });
        afterEach(() => {
          // reset testController's friends and requests after each test
          testController.playerFriends = [];
          testController.playerFriendRequests = [];
        });
        it('Does not emit a playerFriendRequestsChanged event', () => {
          // should be 4 calls from the beforeEach setup
          expect(mockListeners.playerFriendRequestsChanged).toBeCalledTimes(4);
          // player 1 removes our player as friend
          friendRemovedEventListener(player1ToOurPlayer);

          // should not be called any more times
          expect(mockListeners.playerFriendRequestsChanged).toBeCalledTimes(4);
          // our player removes player 2 as friend
          friendRemovedEventListener(ourPlayerToPlayer2);

          // should not be called any more times
          expect(mockListeners.playerFriendRequestsChanged).toBeCalledTimes(4);
        });

        it('Emits a playerFriendsChanged with the updated list of friends', () => {
          // expect a player friends change from the before each setup
          expect(mockListeners.playerFriendsChanged).toBeCalledWith([player1PC, player2PC]);

          // player 1 removes our player as friend
          friendRemovedEventListener(player1ToOurPlayer);
          // should expect testController's friend list to no longer include player 1
          expect(mockListeners.playerFriendsChanged).toBeCalledWith([player2PC]);

          // our player removes player 2 as friend
          friendRemovedEventListener(ourPlayerToPlayer2);
          // should expect testController's player to be empty now
          expect(mockListeners.playerFriendsChanged).toBeCalledWith([]);
        });
        it('Emits a playersChanged event with the updated list of players', () => {
          //
        });
        it('Updates the controllers list of friends if we are the actor', () => {
          // expect player 1 and player 2 in testController's friends
          expect(testController.playerFriends).toEqual([player1PC, player2PC]);

          // player 2 removes our player as friend
          friendRemovedEventListener(player2AcceptOurPlayer);

          expect(testController.playerFriends).toEqual([player1PC]);
        });
        it('Updates the controllers list of friends if we are the affected', () => {
          // expect player 1 and player 2 in testController's friends
          expect(testController.playerFriends).toEqual([player1PC, player2PC]);
          // player 2 removes our player as friend
          friendRemovedEventListener(player1ToOurPlayer);
          // testController's friend list shouldn't include player 2 anymore
          expect(testController.playerFriends).toEqual([player2PC]);
        });
        it('Does nothing if the request doesnt include ourPlayer', () => {
          // should be two from beforeEach
          expect(mockListeners.playerFriendsChanged).toBeCalledTimes(2);
          expect(testController.playerFriends).toEqual([player1PC, player2PC]);

          // player 1 removes player 2 as friend
          friendRemovedEventListener({ actor: playerTestData.id, affected: playerTestData2.id });

          // make sure that it doesn't change
          expect(mockListeners.playerFriendsChanged).toBeCalledTimes(2);
          expect(testController.playerFriends).toEqual([player1PC, player2PC]);
        });
      });
    });
    describe('ConversationAreaInviteRequest events', () => {
      let conversationAreaRequestSentEventListener: (update: ConversationAreaGroupInvite) => void;
      let conversationAreaRequestAcceptedEventListener: (update: TeleportInviteSingular) => void;
      let conversationAreaRequestDeclinedEventListener: (update: TeleportInviteSingular) => void;
      let convAreaGroupInviteOurPlayer: ConversationAreaGroupInvite;
      let convAreaGroupInviteNotOurPlayer: ConversationAreaGroupInvite;
      let teleportInviteOurPlayer: TeleportInviteSingular;
      let teleportInviteOurPlayer2: TeleportInviteSingular;
      let teleportInviteNotOurPlayer: TeleportInviteSingular;
      let ourPlayerInvites: TeleportInviteSingular[];
      beforeEach(() => {
        conversationAreaRequestSentEventListener = getEventListener(
          mockSocket,
          'conversationAreaRequestSent',
        );
        conversationAreaRequestAcceptedEventListener = getEventListener(
          mockSocket,
          'conversationAreaRequestAccepted',
        );
        conversationAreaRequestDeclinedEventListener = getEventListener(
          mockSocket,
          'conversationAreaRequestDeclined',
        );

        mockClear(mockListeners.conversationAreaInvitesChanged);
        testController.addListener(
          'conversationAreaInvitesChanged',
          mockListeners.conversationAreaInvitesChanged,
        );

        player1Location = { x: 0, y: 0, rotation: 'back', moving: false };
        player2Location = { x: 1, y: 1, rotation: 'front', moving: false };
        convAreaGroupInviteOurPlayer = {
          requester: playerTestData.id,
          requested: [testController.ourPlayer.id],
          requesterLocation: player1Location,
        };
        convAreaGroupInviteNotOurPlayer = {
          requester: playerTestData.id,
          requested: [playerTestData3.id],
          requesterLocation: player1Location,
        };
        teleportInviteOurPlayer = {
          requester: playerTestData.id,
          requested: testController.ourPlayer.id,
          requesterLocation: player1Location,
        };
        teleportInviteOurPlayer2 = {
          requester: playerTestData2.id,
          requested: testController.ourPlayer.id,
          requesterLocation: player2Location,
        };
        teleportInviteNotOurPlayer = {
          requester: playerTestData.id,
          requested: playerTestData3.id,
          requesterLocation: player1Location,
        };
        ourPlayerInvites = [teleportInviteOurPlayer, teleportInviteOurPlayer2];
      });
      describe('conversationAreaRequestSent events', () => {
        it('Emits a conversationAreaInvitesChanged event if a new invite is sent that affects this player (i.e. if this player was invited)', () => {
          // send a group invite from player1 to ourPlayer
          conversationAreaRequestSentEventListener(convAreaGroupInviteOurPlayer);

          // expect to see it emitted
          expect(mockListeners.conversationAreaInvitesChanged).toBeCalledWith([
            teleportInviteOurPlayer,
          ]);
        });
        it('Adds the corresponding singular invite to internal list if a new group invite is sent that affects this player (i.e. this player was invited)', () => {
          conversationAreaRequestSentEventListener(convAreaGroupInviteOurPlayer);

          // expect to see the new invite added to conversationAreaInvitesInternal
          const convInvitesInternalAfter: TeleportInviteSingular[] = [teleportInviteOurPlayer];
          expect(testController.conversationAreaInvites).toStrictEqual(convInvitesInternalAfter);
        });
        it('Does not emit a conversationAreaInvitesChanged event if this player was not one of the requested in the received group invite', () => {
          conversationAreaRequestSentEventListener(convAreaGroupInviteNotOurPlayer);

          // expect to not see event emitted
          expect(mockListeners.conversationAreaInvitesChanged).not.toHaveBeenCalled();
        });
        it('Does not add the corresponding invite to the list of invites if this player was not one of the requested in the received group invite', () => {
          const convInvitesInternalBefore: TeleportInviteSingular[] = [];
          conversationAreaRequestSentEventListener(convAreaGroupInviteNotOurPlayer);
          expect(testController.conversationAreaInvites).toStrictEqual(convInvitesInternalBefore);
        });
        it('Does not emit a conversationAreaInvitesChanged event if the new group invite corresponds to an existing singular invite', () => {
          testController.conversationAreaInvites = ourPlayerInvites;
          mockClear(mockListeners.conversationAreaInvitesChanged);

          conversationAreaRequestSentEventListener(convAreaGroupInviteOurPlayer);

          // expect to not see event emitted
          expect(mockListeners.conversationAreaInvitesChanged).not.toHaveBeenCalled();
        });
        it('Does not add the corresponding individual invite to the list if it already exists', () => {
          testController.conversationAreaInvites = ourPlayerInvites;

          conversationAreaRequestSentEventListener(convAreaGroupInviteOurPlayer);
          expect(testController.conversationAreaInvites).toStrictEqual([
            teleportInviteOurPlayer,
            teleportInviteOurPlayer2,
          ]);
        });
      });
      describe('conversationAreaRequestAccepted events', () => {
        it('Emits a conversationAreaInvitesChanged event if this player accepted the invite', () => {
          // populate conversation area invites with two teleport invites
          testController.conversationAreaInvites = ourPlayerInvites;
          conversationAreaRequestAcceptedEventListener(teleportInviteOurPlayer);
          expect(mockListeners.conversationAreaInvitesChanged).toBeCalledWith([
            teleportInviteOurPlayer2,
          ]);

          // accept second invite
          conversationAreaRequestAcceptedEventListener(teleportInviteOurPlayer2);
          expect(mockListeners.conversationAreaInvitesChanged).toBeCalledWith([]);
        });
        it('Removes the invite if this player accepted it', () => {
          testController.conversationAreaInvites = ourPlayerInvites;
          conversationAreaRequestAcceptedEventListener(teleportInviteOurPlayer2);

          expect(testController.conversationAreaInvites).toStrictEqual([teleportInviteOurPlayer]);
        });
        it('Does not modify invites list if this player was not the acceptor of the invite', () => {
          testController.conversationAreaInvites = [teleportInviteOurPlayer];
          conversationAreaRequestAcceptedEventListener(teleportInviteNotOurPlayer);

          expect(testController.conversationAreaInvites).toStrictEqual([teleportInviteOurPlayer]);
        });
      });
      describe('conversationAreaRequestDeclined events', () => {
        it('Emits a conversationAreaInvitesChanged event if this player declined the invite', () => {
          // populate conversation area invites with two teleport invites
          testController.conversationAreaInvites = ourPlayerInvites;
          conversationAreaRequestDeclinedEventListener(teleportInviteOurPlayer);
          expect(mockListeners.conversationAreaInvitesChanged).toBeCalledWith([
            teleportInviteOurPlayer2,
          ]);

          // decline second invite
          conversationAreaRequestDeclinedEventListener(teleportInviteOurPlayer2);
          expect(mockListeners.conversationAreaInvitesChanged).toBeCalledWith([]);
        });
        it('Removes the invite if this player declined it', () => {
          testController.conversationAreaInvites = ourPlayerInvites;
          conversationAreaRequestDeclinedEventListener(teleportInviteOurPlayer2);

          expect(testController.conversationAreaInvites).toStrictEqual([teleportInviteOurPlayer]);
        });
        it('Does not modify invites list if this player was not the decliner of the invite', () => {
          testController.conversationAreaInvites = [teleportInviteOurPlayer];
          conversationAreaRequestDeclinedEventListener(teleportInviteNotOurPlayer);

          expect(testController.conversationAreaInvites).toStrictEqual([teleportInviteOurPlayer]);
        });
      });
    });
    describe('MiniMessage events', () => {
      let miniMessageSentEventListener: (update: MiniMessage) => void;
      let testMessageToOurPlayer: MiniMessage;
      beforeEach(() => {
        miniMessageSentEventListener = getEventListener(mockSocket, 'miniMessageSent');
        testMessageToOurPlayer = {
          sender: playerTestData2.id,
          recipients: [playerTestData.id, testController.ourPlayer.id, playerTestData3.id],
          body: 'Hi',
        };

        mockClear(mockListeners.newMiniMessageReceived);
        testController.addListener('newMiniMessageReceived', mockListeners.newMiniMessageReceived);
      });
      it('Emits a newMiniMessageReceived event if a new mini message is sent and this player was one of the recipients', () => {
        // send a mini message from player2 to ourPlayer
        miniMessageSentEventListener(testMessageToOurPlayer);

        // expect to see it emitted
        expect(mockListeners.newMiniMessageReceived).toBeCalledWith(testMessageToOurPlayer);
      });
      it('Emits a newMiniMessageReceived event if an identical mini message is sent and this player was one of the recipients', () => {
        miniMessageSentEventListener(testMessageToOurPlayer);

        // expect to see first event emitted
        expect(mockListeners.newMiniMessageReceived).toBeCalledWith(testMessageToOurPlayer);

        // send identical message again
        miniMessageSentEventListener(testMessageToOurPlayer);

        // expect to see listener called twice
        expect(mockListeners.newMiniMessageReceived).toBeCalledTimes(2);
      });
    });
  });
  describe('Processing events that are received over the socket from the townService', () => {
    let testPlayer: PlayerModel;
    let testPlayer2: PlayerModel;
    let testPlayerController: PlayerController;
    let testPlayerController2: PlayerController;
    let testPlayerPlayersChangedFn: jest.MockedFunction<TownEvents['playersChanged']>;

    beforeEach(() => {
      // Create a new PlayerModel and corresponding PlayerController
      testPlayer = {
        id: nanoid(),
        location: { moving: false, rotation: 'back', x: 0, y: 1, interactableID: nanoid() },
        userName: nanoid(),
      };
      testPlayerController = PlayerController.fromPlayerModel(testPlayer);
      // Create second player and corresponding PlayerController
      testPlayer2 = {
        id: 'player2id',
        location: { moving: false, rotation: 'back', x: 10, y: 11, interactableID: nanoid() },
        userName: 'player2',
      };
      testPlayerController2 = PlayerController.fromPlayerModel(testPlayer2);

      // Add the player to the test town
      testPlayerPlayersChangedFn = emitEventAndExpectListenerFiring(
        'playerJoined',
        testPlayer,
        'playersChanged',
      );

      // make player 1 our friend
      testController.playerFriends = [testPlayerController];
      // select friend testPlayerController
      testController.selectFriend(testPlayerController);
    });
    it('Emits playersChanged events when players join', () => {
      expect(testPlayerPlayersChangedFn).toBeCalledWith([
        PlayerController.fromPlayerModel(testPlayer),
      ]);
    });
    it('Emits playersChanged events when players leave', () => {
      emitEventAndExpectListenerFiring('playerDisconnect', testPlayer, 'playersChanged', []);
    });
    it('Emits playerFriendsChanged events when a friend leaves', () => {
      emitEventAndExpectListenerFiring(
        'playerDisconnect',
        testPlayerController,
        'playerFriendsChanged',
        [],
      );
    });
    it('Emits selectedFriendsChanged events when a friend leaves', () => {
      emitEventAndExpectListenerFiring(
        'playerDisconnect',
        testPlayerController,
        'selectedFriendsChanged',
        [],
      );
    });
    it('Emits playerFriendRequestsChanged events when player in your current requests leave', () => {
      // add player 2 to the town
      emitEventAndExpectListenerFiring('playerJoined', testPlayer2, 'playersChanged');
      // create a request from player 1 to player 2 and store it and store it in the friend request list
      const requestFromPlayer1ToPlayer2 = {
        actor: testPlayer.id,
        affected: testPlayer2.id,
      };
      testController.playerFriendRequests = [requestFromPlayer1ToPlayer2];

      // disconnect player 2 and expect the request is removed and expect the friend request
      // involving player 2 to be removed from the friend request list
      emitEventAndExpectListenerFiring(
        'playerDisconnect',
        testPlayerController2,
        'playerFriendRequestsChanged',
        [],
      );
    });
    it('Emits playerMoved events when players join', async () => {
      emitEventAndExpectListenerFiring(
        'playerJoined',
        testPlayer,
        'playerMoved',
        PlayerController.fromPlayerModel(testPlayer),
      );
    });
    it('Updates friends location on playerMoved event', async () => {
      testPlayer.location = {
        moving: true,
        rotation: 'front',
        x: 10,
        y: 10,
        interactableID: nanoid(),
      };

      // emit an event saying testPlayer was moved
      emitEventAndExpectListenerFiring(
        'playerMoved',
        testPlayer,
        'playerMoved',
        PlayerController.fromPlayerModel(testPlayer),
      );

      // get the corresponding PlayerController for testPlayer from our friends list (instead of player list)
      const testPlayerInFriendsList = testController.playerFriends.find(
        friend => friend.id === testPlayer.id,
      ) as PlayerController;

      // expect that the controller in our friend list updated in addition to the one in the player list
      expect(testPlayerInFriendsList.location).toEqual(testPlayer.location);
    });
    it('Updates selected friends location on playerMoved event', async () => {
      testPlayer.location = {
        moving: true,
        rotation: 'front',
        x: 10,
        y: 10,
        interactableID: nanoid(),
      };

      // emit an event saying testPlayer was moved
      emitEventAndExpectListenerFiring(
        'playerMoved',
        testPlayer,
        'playerMoved',
        PlayerController.fromPlayerModel(testPlayer),
      );

      // get the corresponding PlayerController for testPlayer from our selected friends list (instead of player list)
      const testSelectedFriend = testController.playerFriends.find(
        friend => friend.id === testPlayer.id,
      ) as PlayerController;

      // expect that the controller in our friend list updated in addition to the one in the player list
      expect(testSelectedFriend.location).toEqual(testPlayer.location);
    });
    it('Emits playerMoved events when players move', async () => {
      testPlayer.location = {
        moving: true,
        rotation: 'front',
        x: 1,
        y: 0,
        interactableID: nanoid(),
      };
      emitEventAndExpectListenerFiring(
        'playerMoved',
        testPlayer,
        'playerMoved',
        PlayerController.fromPlayerModel(testPlayer),
      );
    });
  });
  it('Disconnects the socket and clears the coveyTownController when disconnection', async () => {
    emitEventAndExpectListenerFiring('townClosing', undefined, 'disconnect');
    expect(mockLoginController.setTownController).toBeCalledWith(null);
  });
});
