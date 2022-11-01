import { ITiledMap } from '@jonbell/tiled-map-type-guard';
import { DeepMockProxy, mockClear, mockDeep, mockReset } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import Player from '../lib/Player';
import TwilioVideo from '../lib/TwilioVideo';
import {
  ClientEventTypes,
  expectArraysToContainSameMembers,
  getEventListener,
  getLastEmittedEvent,
  MockedPlayer,
  mockPlayer,
} from '../TestUtils';
import {
  ChatMessage,
  ConversationAreaInvite,
  Interactable,
  PlayerLocation,
  TeleportInviteSingular,
  TownEmitter,
  ViewingArea as ViewingAreaModel,
} from '../types/CoveyTownSocket';
import ConversationArea from './ConversationArea';
import Town from './Town';

const mockTwilioVideo = mockDeep<TwilioVideo>();
jest.spyOn(TwilioVideo, 'getInstance').mockReturnValue(mockTwilioVideo);

type TestMapDict = {
  [key in string]: ITiledMap;
};
const testingMaps: TestMapDict = {
  twoConv: {
    tiledversion: '1.9.0',
    tileheight: 32,
    tilesets: [],
    tilewidth: 32,
    type: 'map',
    layers: [
      {
        id: 4,
        name: 'Objects',
        objects: [
          {
            type: 'ConversationArea',
            height: 237,
            id: 39,
            name: 'Name1',
            rotation: 0,
            visible: true,
            width: 326,
            x: 40,
            y: 120,
          },
          {
            type: 'ConversationArea',
            height: 266,
            id: 43,
            name: 'Name2',
            rotation: 0,
            visible: true,
            width: 467,
            x: 612,
            y: 120,
          },
        ],
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
  },
  overlapping: {
    tiledversion: '1.9.0',
    tileheight: 32,
    tilesets: [],
    tilewidth: 32,
    type: 'map',
    layers: [
      {
        id: 4,
        name: 'Objects',
        objects: [
          {
            type: 'ConversationArea',
            height: 237,
            id: 39,
            name: 'Name1',
            rotation: 0,
            visible: true,
            width: 326,
            x: 40,
            y: 120,
          },
          {
            type: 'ConversationArea',
            height: 266,
            id: 43,
            name: 'Name2',
            rotation: 0,
            visible: true,
            width: 467,
            x: 40,
            y: 120,
          },
        ],
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
  },
  noObjects: {
    tiledversion: '1.9.0',
    tileheight: 32,
    tilesets: [],
    tilewidth: 32,
    type: 'map',
    layers: [],
  },
  duplicateNames: {
    tiledversion: '1.9.0',
    tileheight: 32,
    tilesets: [],
    tilewidth: 32,
    type: 'map',
    layers: [
      {
        id: 4,
        name: 'Objects',
        objects: [
          {
            type: 'ConversationArea',
            height: 237,
            id: 39,
            name: 'Name1',
            rotation: 0,
            visible: true,
            width: 326,
            x: 40,
            y: 120,
          },
          {
            type: 'ConversationArea',
            height: 266,
            id: 43,
            name: 'Name1',
            rotation: 0,
            visible: true,
            width: 467,
            x: 612,
            y: 120,
          },
        ],
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
  },
  twoViewing: {
    tiledversion: '1.9.0',
    tileheight: 32,
    tilesets: [],
    tilewidth: 32,
    type: 'map',
    layers: [
      {
        id: 4,
        name: 'Objects',
        objects: [
          {
            type: 'ViewingArea',
            height: 237,
            id: 39,
            name: 'Name1',
            rotation: 0,
            visible: true,
            width: 326,
            x: 40,
            y: 120,
          },
          {
            type: 'ViewingArea',
            height: 266,
            id: 43,
            name: 'Name2',
            rotation: 0,
            visible: true,
            width: 467,
            x: 612,
            y: 120,
          },
        ],
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
  },
  twoConvOneViewing: {
    tiledversion: '1.9.0',
    tileheight: 32,
    tilesets: [],
    tilewidth: 32,
    type: 'map',
    layers: [
      {
        id: 4,
        name: 'Objects',
        objects: [
          {
            type: 'ConversationArea',
            height: 237,
            id: 39,
            name: 'Name1',
            rotation: 0,
            visible: true,
            width: 326,
            x: 40,
            y: 120,
          },
          {
            type: 'ConversationArea',
            height: 266,
            id: 43,
            name: 'Name2',
            rotation: 0,
            visible: true,
            width: 467,
            x: 612,
            y: 120,
          },
          {
            type: 'ViewingArea',
            height: 237,
            id: 54,
            name: 'Name3',
            properties: [
              {
                name: 'video',
                type: 'string',
                value: 'someURL',
              },
            ],
            rotation: 0,
            visible: true,
            width: 326,
            x: 155,
            y: 566,
          },
        ],
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
  },
  twoConvTwoViewing: {
    tiledversion: '1.9.0',
    tileheight: 32,
    tilesets: [],
    tilewidth: 32,
    type: 'map',
    layers: [
      {
        id: 4,
        name: 'Objects',
        objects: [
          {
            type: 'ConversationArea',
            height: 237,
            id: 39,
            name: 'Name1',
            rotation: 0,
            visible: true,
            width: 326,
            x: 40,
            y: 120,
          },
          {
            type: 'ConversationArea',
            height: 266,
            id: 43,
            name: 'Name2',
            rotation: 0,
            visible: true,
            width: 467,
            x: 612,
            y: 120,
          },
          {
            type: 'ViewingArea',
            height: 237,
            id: 54,
            name: 'Name3',
            properties: [
              {
                name: 'video',
                type: 'string',
                value: 'someURL',
              },
            ],
            rotation: 0,
            visible: true,
            width: 326,
            x: 155,
            y: 566,
          },
          {
            type: 'ViewingArea',
            height: 237,
            id: 55,
            name: 'Name4',
            properties: [
              {
                name: 'video',
                type: 'string',
                value: 'someURL',
              },
            ],
            rotation: 0,
            visible: true,
            width: 326,
            x: 600,
            y: 1200,
          },
        ],
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
  },
};

describe('Town', () => {
  const townEmitter: DeepMockProxy<TownEmitter> = mockDeep<TownEmitter>();
  let town: Town;
  let player: Player;
  let player2: Player;
  let playerTestData: MockedPlayer;
  let playerTestData2: MockedPlayer;
  let playerLocation: PlayerLocation;
  let player2Location: PlayerLocation;
  let playerFriends: Player[];
  let player2Friends: Player[];
  let teleportRequest: TeleportInviteSingular;
  let conversationRequest: ConversationAreaInvite;

  beforeEach(async () => {
    town = new Town(nanoid(), false, nanoid(), townEmitter);
    playerTestData = mockPlayer(town.townID);
    playerTestData2 = mockPlayer(town.townID);
    player = await town.addPlayer(playerTestData.userName, playerTestData.socket);
    player2 = await town.addPlayer(playerTestData2.userName, playerTestData2.socket);
    playerTestData.player = player;
    playerTestData2.player = player2;
    // Set this dummy player to be off the map so that they do not show up in conversation areas
    playerTestData.moveTo(-1, -1);
    playerTestData2.moveTo(-5, -5);
    teleportRequest = {
      requester: player,
      requested: player2,
      requesterLocation: player.location,
    };
    conversationRequest = {
      requester: player,
      requested: [player2],
      requesterLocation: player.location,
    };
    playerLocation = player.location;
    player2Location = player2.location;
    playerFriends = player.friends;
    player2Friends = player2.friends;
    mockReset(townEmitter);
  });

  it('constructor should set its properties', () => {
    const townName = `FriendlyNameTest-${nanoid()}`;
    const townID = nanoid();
    const testTown = new Town(townName, true, townID, townEmitter);
    expect(testTown.friendlyName).toBe(townName);
    expect(testTown.townID).toBe(townID);
    expect(testTown.isPubliclyListed).toBe(true);
  });
  describe('addPlayer', () => {
    it('should use the townID and player ID properties when requesting a video token', async () => {
      const newPlayer = mockPlayer(town.townID);
      mockTwilioVideo.getTokenForTown.mockClear();
      const newPlayerObj = await town.addPlayer(newPlayer.userName, newPlayer.socket);

      expect(mockTwilioVideo.getTokenForTown).toBeCalledTimes(1);
      expect(mockTwilioVideo.getTokenForTown).toBeCalledWith(town.townID, newPlayerObj.id);
    });
    it('should register callbacks for all client-to-server events', () => {
      const expectedEvents: ClientEventTypes[] = [
        'disconnect',
        'chatMessage',
        'playerMovement',
        'interactableUpdate',
        'acceptFriendRequest',
        'declineFriendRequest',
      ];
      expectedEvents.forEach(eachEvent =>
        expect(getEventListener(playerTestData.socket, eachEvent)).toBeDefined(),
      );
    });
    describe('[T1] interactableUpdate callback', () => {
      let interactableUpdateHandler: (update: Interactable) => void;
      beforeEach(() => {
        town.initializeFromMap(testingMaps.twoConvTwoViewing);
        interactableUpdateHandler = getEventListener(playerTestData.socket, 'interactableUpdate');
      });
      it('Should not throw an error for any interactable area that is not a viewing area', () => {
        expect(() =>
          interactableUpdateHandler({ id: 'Name1', topic: nanoid(), occupantsByID: [] }),
        ).not.toThrowError();
      });
      it('Should not throw an error if there is no such viewing area', () => {
        expect(() =>
          interactableUpdateHandler({
            id: 'NotActuallyAnInteractable',
            topic: nanoid(),
            occupantsByID: [],
          }),
        ).not.toThrowError();
      });
      describe('When called passing a valid viewing area', () => {
        let newArea: ViewingAreaModel;
        let secondPlayer: MockedPlayer;
        beforeEach(async () => {
          newArea = {
            id: 'Name4',
            elapsedTimeSec: 0,
            isPlaying: true,
            video: nanoid(),
          };
          expect(town.addViewingArea(newArea)).toBe(true);
          secondPlayer = mockPlayer(town.townID);
          mockTwilioVideo.getTokenForTown.mockClear();
          await town.addPlayer(secondPlayer.userName, secondPlayer.socket);

          newArea.elapsedTimeSec = 100;
          newArea.isPlaying = false;
          mockClear(townEmitter);

          mockClear(secondPlayer.socket);
          mockClear(secondPlayer.socketToRoomMock);
          interactableUpdateHandler(newArea);
        });
        it("Should emit the interactable update to the other players in the town using the player's townEmitter, after the viewing area was successfully created", () => {
          const updatedArea = town.getInteractable(newArea.id);
          expect(updatedArea.toModel()).toEqual(newArea);
        });
        it('Should update the model for the viewing area', () => {
          const lastUpdate = getLastEmittedEvent(
            playerTestData.socketToRoomMock,
            'interactableUpdate',
          );
          expect(lastUpdate).toEqual(newArea);
        });
        it('Should not emit interactableUpdate events to players directly, or to the whole town', () => {
          expect(() =>
            getLastEmittedEvent(playerTestData.socket, 'interactableUpdate'),
          ).toThrowError();
          expect(() => getLastEmittedEvent(townEmitter, 'interactableUpdate')).toThrowError();
          expect(() =>
            getLastEmittedEvent(secondPlayer.socket, 'interactableUpdate'),
          ).toThrowError();
          expect(() =>
            getLastEmittedEvent(secondPlayer.socketToRoomMock, 'interactableUpdate'),
          ).toThrowError();
        });
      });
    });
  });
  describe('Socket event listeners created in addPlayer', () => {
    describe('on socket disconnect', () => {
      function disconnectPlayer(playerToLeave: MockedPlayer) {
        // Call the disconnect event handler
        const disconnectHandler = getEventListener(playerToLeave.socket, 'disconnect');
        disconnectHandler('unknown');
      }
      it("Invalidates the players's session token", async () => {
        const token = player.sessionToken;

        expect(town.getPlayerBySessionToken(token)).toBe(player);
        disconnectPlayer(playerTestData);

        expect(town.getPlayerBySessionToken(token)).toEqual(undefined);
      });
      it('Informs all other players of the disconnection using the broadcast emitter', () => {
        const playerToLeaveID = player.id;

        disconnectPlayer(playerTestData);
        const callToDisconnect = getLastEmittedEvent(townEmitter, 'playerDisconnect');
        expect(callToDisconnect.id).toEqual(playerToLeaveID);
      });
      it('Removes the player from any active conversation area', () => {
        // Load in a map with a conversation area
        town.initializeFromMap(testingMaps.twoConvOneViewing);
        playerTestData.moveTo(45, 122); // Inside of "Name1" area
        expect(
          town.addConversationArea({ id: 'Name1', topic: 'test', occupantsByID: [] }),
        ).toBeTruthy();
        const convArea = town.getInteractable('Name1') as ConversationArea;
        const previousOccupancy = town.occupancy;
        expect(convArea.occupantsByID).toEqual([player.id]);
        disconnectPlayer(playerTestData);
        expect(convArea.occupantsByID).toEqual([]);
        expect(town.occupancy).toBe(previousOccupancy - 1);
      });

      it('Removes the player from any active viewing area', () => {
        // Load in a map with a conversation area
        town.initializeFromMap(testingMaps.twoConvOneViewing);
        playerTestData.moveTo(156, 567); // Inside of "Name3" area
        expect(
          town.addViewingArea({ id: 'Name3', isPlaying: true, elapsedTimeSec: 0, video: nanoid() }),
        ).toBeTruthy();
        const viewingArea = town.getInteractable('Name3');
        expect(viewingArea.occupantsByID).toEqual([player.id]);
        disconnectPlayer(playerTestData);
        expect(viewingArea.occupantsByID).toEqual([]);
      });
    });
    describe('playerMovement', () => {
      const newLocation: PlayerLocation = {
        x: 100,
        y: 100,
        rotation: 'back',
        moving: true,
      };

      beforeEach(() => {
        playerTestData.moveTo(
          newLocation.x,
          newLocation.y,
          newLocation.rotation,
          newLocation.moving,
        );
      });

      it('Emits a playerMoved event', () => {
        const lastEmittedMovement = getLastEmittedEvent(townEmitter, 'playerMoved');
        expect(lastEmittedMovement.id).toEqual(playerTestData.player?.id);
        expect(lastEmittedMovement.location).toEqual(newLocation);
      });
      it("Updates the player's location", () => {
        expect(player.location).toEqual(newLocation);
      });
    });
    describe('interactableUpdate', () => {
      let interactableUpdateCallback: (update: Interactable) => void;
      let update: ViewingAreaModel;
      beforeEach(async () => {
        town.initializeFromMap(testingMaps.twoConvOneViewing);
        playerTestData.moveTo(156, 567); // Inside of "Name3" viewing area
        interactableUpdateCallback = getEventListener(playerTestData.socket, 'interactableUpdate');
        update = {
          id: 'Name3',
          isPlaying: true,
          elapsedTimeSec: 100,
          video: nanoid(),
        };
        interactableUpdateCallback(update);
      });
      it('forwards updates to others in the town', () => {
        const lastEvent = getLastEmittedEvent(
          playerTestData.socketToRoomMock,
          'interactableUpdate',
        );
        expect(lastEvent).toEqual(update);
      });
      it('does not forward updates to the ENTIRE town', () => {
        expect(
          // getLastEmittedEvent will throw an error if no event was emitted, which we expect to be the case here
          () => getLastEmittedEvent(townEmitter, 'interactableUpdate'),
        ).toThrowError();
      });
      it('updates the local model for that interactable', () => {
        const interactable = town.getInteractable(update.id);
        expect(interactable?.toModel()).toEqual(update);
      });
    });
    describe('acceptFriendRequest (listener)', () => {
      beforeEach(() => {
        playerTestData.acceptedFriendRequest(player, player2);
      });
      it('Should add each Player to each others friends lists', () => {
        expect(player.friends.includes(player2)).toBeTruthy();
        expect(player2.friends.includes(player)).toBeTruthy();
      });
      it('TownService should emit a friendRequestAccepted event', () => {
        expect(townEmitter.emit).toBeCalledWith('friendRequestAccepted', {
          actor: player,
          affected: player2,
        });
      });
    });
    describe('declineFriendRequest (listener)', () => {
      beforeEach(() => {
        playerTestData.declinedFriendRequest(player, player2);
      });
      it('Should NOT modify either of the Players friends lists', () => {
        expect(player.friends.includes(player2)).toBeFalsy();
        expect(player2.friends.includes(player)).toBeFalsy();
      });
      it('TownService should emit a friendRequestDeclined event', () => {
        expect(townEmitter.emit).toBeCalledWith('friendRequestDeclined', {
          actor: player,
          affected: player2,
        });
      });
    });
    describe('sendFriendRequest', () => {
      beforeEach(() => {
        playerTestData.sendFriendRequest(player, player2);
      });
      it('Should NOT modify either of the Players friends lists', () => {
        expect(player.friends.includes(player2)).toBeFalsy();
        expect(player2.friends.includes(player)).toBeFalsy();
      });
      it('TownService should emit a friendRequestSent event', () => {
        expect(townEmitter.emit).toBeCalledWith('friendRequestSent', {
          actor: player,
          affected: player2,
        });
      });
    });
    describe('cancelFriendRequest', () => {
      beforeEach(() => {
        playerTestData.sendFriendRequest(player, player2);
      });
      it('Should NOT modify either of the Players friends lists', () => {
        expect(player.friends.includes(player2)).toBeFalsy();
        expect(player2.friends.includes(player)).toBeFalsy();
      });
      it('TownService should emit a canceledFriendRequest event', () => {
        // expect the request was sent
        expect(townEmitter.emit).toBeCalledWith('friendRequestSent', {
          actor: player,
          affected: player2,
        });
        // cancel the request
        playerTestData.cancelFriendRequest(player, player2);
        // expect it to be canceled
        expect(townEmitter.emit).toBeCalledWith('friendRequestCanceled', {
          actor: player,
          affected: player2,
        });
      });
    });
    it('Forwards chat messages to all players in the same town', async () => {
      const chatHandler = getEventListener(playerTestData.socket, 'chatMessage');
      const chatMessage: ChatMessage = {
        author: player.id,
        body: 'Test message',
        dateCreated: new Date(),
        sid: 'test message id',
      };

      chatHandler(chatMessage);

      const emittedMessage = getLastEmittedEvent(townEmitter, 'chatMessage');
      expect(emittedMessage).toEqual(chatMessage);
    });
  });
  describe('addConversationArea', () => {
    beforeEach(async () => {
      town.initializeFromMap(testingMaps.twoConvOneViewing);
    });
    it('Should return false if no area exists with that ID', () => {
      expect(
        town.addConversationArea({ id: nanoid(), topic: nanoid(), occupantsByID: [] }),
      ).toEqual(false);
    });
    it('Should return false if the requested topic is empty', () => {
      expect(town.addConversationArea({ id: 'Name1', topic: '', occupantsByID: [] })).toEqual(
        false,
      );
      expect(
        town.addConversationArea({ id: 'Name1', topic: undefined, occupantsByID: [] }),
      ).toEqual(false);
    });
    it('Should return false if the area already has a topic', () => {
      expect(
        town.addConversationArea({ id: 'Name1', topic: 'new topic', occupantsByID: [] }),
      ).toEqual(true);
      expect(
        town.addConversationArea({ id: 'Name1', topic: 'new new topic', occupantsByID: [] }),
      ).toEqual(false);
    });
    describe('When successful', () => {
      const newTopic = 'new topic';
      beforeEach(() => {
        playerTestData.moveTo(45, 122); // Inside of "Name1" area
        expect(
          town.addConversationArea({ id: 'Name1', topic: newTopic, occupantsByID: [] }),
        ).toEqual(true);
      });
      it('Should update the local model for that area', () => {
        const convArea = town.getInteractable('Name1') as ConversationArea;
        expect(convArea.topic).toEqual(newTopic);
      });
      it('Should include any players in that area as occupants', () => {
        const convArea = town.getInteractable('Name1') as ConversationArea;
        expect(convArea.occupantsByID).toEqual([player.id]);
      });
      it('Should emit an interactableUpdate message', () => {
        const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
        expect(lastEmittedUpdate).toEqual({
          id: 'Name1',
          topic: newTopic,
          occupantsByID: [player.id],
        });
      });
    });
  });
  describe('[T1] addViewingArea', () => {
    beforeEach(async () => {
      town.initializeFromMap(testingMaps.twoConvOneViewing);
    });
    it('Should return false if no area exists with that ID', () => {
      expect(
        town.addViewingArea({ id: nanoid(), isPlaying: false, elapsedTimeSec: 0, video: nanoid() }),
      ).toBe(false);
    });
    it('Should return false if the requested video is empty', () => {
      expect(
        town.addViewingArea({ id: 'Name3', isPlaying: false, elapsedTimeSec: 0, video: '' }),
      ).toBe(false);
      expect(
        town.addViewingArea({ id: 'Name3', isPlaying: false, elapsedTimeSec: 0, video: undefined }),
      ).toBe(false);
    });
    it('Should return false if the area is already active', () => {
      expect(
        town.addViewingArea({ id: 'Name3', isPlaying: false, elapsedTimeSec: 0, video: 'test' }),
      ).toBe(true);
      expect(
        town.addViewingArea({ id: 'Name3', isPlaying: false, elapsedTimeSec: 0, video: 'test2' }),
      ).toBe(false);
    });
    describe('When successful', () => {
      const newModel: ViewingAreaModel = {
        id: 'Name3',
        isPlaying: true,
        elapsedTimeSec: 100,
        video: nanoid(),
      };
      beforeEach(() => {
        playerTestData.moveTo(160, 570); // Inside of "Name3" area
        expect(town.addViewingArea(newModel)).toBe(true);
      });

      it('Should update the local model for that area', () => {
        const viewingArea = town.getInteractable('Name3');
        expect(viewingArea.toModel()).toEqual(newModel);
      });

      it('Should emit an interactableUpdate message', () => {
        const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
        expect(lastEmittedUpdate).toEqual(newModel);
      });
      it('Should include any players in that area as occupants', () => {
        const viewingArea = town.getInteractable('Name3');
        expect(viewingArea.occupantsByID).toEqual([player.id]);
      });
    });
  });
  describe('disconnectAllPlayers', () => {
    beforeEach(() => {
      town.disconnectAllPlayers();
    });
    it('Should emit the townClosing event', () => {
      getLastEmittedEvent(townEmitter, 'townClosing'); // Throws an error if no event existed
    });
    it("Should disconnect each players's socket", () => {
      expect(playerTestData.socket.disconnect).toBeCalledWith(true);
    });
  });
  describe('initializeFromMap', () => {
    const expectInitializingFromMapToThrowError = (map: ITiledMap) => {
      expect(() => town.initializeFromMap(map)).toThrowError();
    };
    it('Throws an error if there is no layer called "objects"', async () => {
      expectInitializingFromMapToThrowError(testingMaps.noObjects);
    });
    it('Throws an error if there are duplicate interactable object IDs', async () => {
      expectInitializingFromMapToThrowError(testingMaps.duplicateNames);
    });
    it('Throws an error if there are overlapping objects', async () => {
      expectInitializingFromMapToThrowError(testingMaps.overlapping);
    });
    it('Creates a ConversationArea instance for each region on the map', async () => {
      town.initializeFromMap(testingMaps.twoConv);
      const conv1 = town.getInteractable('Name1');
      const conv2 = town.getInteractable('Name2');
      expect(conv1.id).toEqual('Name1');
      expect(conv1.boundingBox).toEqual({ x: 40, y: 120, height: 237, width: 326 });
      expect(conv2.id).toEqual('Name2');
      expect(conv2.boundingBox).toEqual({ x: 612, y: 120, height: 266, width: 467 });
      expect(town.interactables.length).toBe(2);
    });
    it('Creates a ViewingArea instance for each region on the map', async () => {
      town.initializeFromMap(testingMaps.twoViewing);
      const viewingArea1 = town.getInteractable('Name1');
      const viewingArea2 = town.getInteractable('Name2');
      expect(viewingArea1.id).toEqual('Name1');
      expect(viewingArea1.boundingBox).toEqual({ x: 40, y: 120, height: 237, width: 326 });
      expect(viewingArea2.id).toEqual('Name2');
      expect(viewingArea2.boundingBox).toEqual({ x: 612, y: 120, height: 266, width: 467 });
      expect(town.interactables.length).toBe(2);
    });
    describe('Updating interactable state in playerMovements', () => {
      beforeEach(async () => {
        town.initializeFromMap(testingMaps.twoConvOneViewing);
        playerTestData.moveTo(51, 121);
        expect(town.addConversationArea({ id: 'Name1', topic: 'test', occupantsByID: [] })).toBe(
          true,
        );
      });
      it('Adds a player to a new interactable and sets their conversation label, if they move into it', async () => {
        const newPlayer = mockPlayer(town.townID);
        const newPlayerObj = await town.addPlayer(newPlayer.userName, newPlayer.socket);
        newPlayer.moveTo(51, 121);

        // Check that the player's location was updated
        expect(newPlayerObj.location.interactableID).toEqual('Name1');

        // Check that a movement event was emitted with the correct label
        const lastEmittedMovement = getLastEmittedEvent(townEmitter, 'playerMoved');
        expect(lastEmittedMovement.location.interactableID).toEqual('Name1');

        // Check that the conversation area occupants was updated
        const occupants = town.getInteractable('Name1').occupantsByID;
        expectArraysToContainSameMembers(occupants, [newPlayerObj.id, player.id]);
      });
      it('Removes a player from their prior interactable and sets their conversation label, if they moved outside of it', () => {
        expect(player.location.interactableID).toEqual('Name1');
        playerTestData.moveTo(0, 0);
        expect(player.location.interactableID).toBeUndefined();
      });
    });
  });
  describe('Updating town settings', () => {
    it('Emits townSettingsUpdated events when friendlyName changes', async () => {
      const newFriendlyName = nanoid();
      town.friendlyName = newFriendlyName;
      expect(townEmitter.emit).toBeCalledWith('townSettingsUpdated', {
        friendlyName: newFriendlyName,
      });
    });
    it('Emits townSettingsUpdated events when isPubliclyListed changes', async () => {
      const expected = !town.isPubliclyListed;
      town.isPubliclyListed = expected;
      expect(townEmitter.emit).toBeCalledWith('townSettingsUpdated', {
        isPubliclyListed: expected,
      });
    });
  });
  describe('inviteFriend', () => {
    it('Emits a friendRequestSent event when called.', () => {
      town.inviteFriend(player, player2);
      expect(townEmitter.emit).toBeCalledWith('friendRequestSent', {
        actor: player,
        affected: player2,
      });
    });
    it('Does not change the actors friends lists.', () => {
      expect(player.friends).toEqual(playerFriends);
      town.inviteFriend(player, player2);
      expect(player.friends).toEqual(playerFriends);
    });
    it('Does not change the affected friends lists.', () => {
      expect(player2.friends).toEqual(player2Friends);
      town.inviteFriend(player, player2);
      expect(player2.friends).toEqual(player2Friends);
    });
  });
  describe('acceptFriendRequest (method)', () => {
    it('Emits a friendRequestAccepted event when called.', () => {
      town.acceptFriendRequest(player, player2);
      expect(townEmitter.emit).toBeCalledWith('friendRequestAccepted', {
        actor: player,
        affected: player2,
      });
    });
    it('Expects the affected to be added to the actors friend list.', () => {
      town.acceptFriendRequest(player, player2);
      expect(player.friends.includes(player2)).toBeTruthy();
    });
    it('Expects the actor to be added to the affected friend list.', () => {
      town.acceptFriendRequest(player, player2);
      expect(player2.friends.includes(player)).toBeTruthy();
    });
  });
  describe('declineFriendRequest (method)', () => {
    it('Emits a friendRequestDeclined event when called.', () => {
      town.inviteFriend(player, player2);
      town.declineFriendRequest(player2, player);
      expect(townEmitter.emit).toHaveBeenLastCalledWith('friendRequestDeclined', {
        actor: player2,
        affected: player,
      });
    });
    it('Does not change the actors friends lists.', () => {
      town.inviteFriend(player, player2);
      expect(player.friends).toEqual(playerFriends);
      town.declineFriendRequest(player2, player);
      expect(player.friends).toEqual(playerFriends);
    });
    it('Does not change the affected friends lists.', () => {
      town.inviteFriend(player, player2);
      expect(player2.friends).toEqual(player2Friends);
      town.declineFriendRequest(player2, player);
      expect(player2.friends).toEqual(player2Friends);
    });
  });
  describe('removeFriend', () => {
    it('Emits a friendRemoved event when called.', () => {
      town.acceptFriendRequest(player, player2);
      expect(player.friends.includes(player2)).toBeTruthy();
      expect(player2.friends.includes(player)).toBeTruthy();
      town.removeFriend(player, player2);
      expect(townEmitter.emit).toBeCalledWith('friendRemoved', {
        actor: player,
        affected: player2,
      });
    });
    it('Removeds the affected from the actors friends list.', () => {
      town.acceptFriendRequest(player, player2);
      expect(player.friends.includes(player2)).toBeTruthy();
      town.removeFriend(player, player2);
      expect(player.friends.includes(player2)).toBeFalsy();
    });
    it('Removes the actor from the affected friends list.', () => {
      town.acceptFriendRequest(player, player2);
      expect(player2.friends.includes(player)).toBeTruthy();
      town.removeFriend(player, player2);
      expect(player2.friends.includes(player)).toBeFalsy();
    });
  });
  describe('teleportToFriend', () => {
    it('Moves requested player to the requesters location', () => {
      expect(player2.location).toEqual(player2Location);
      town.teleportToFriend(teleportRequest);
      expect(player2.location).toEqual(playerLocation);
    });
    it('Does not move the requester', () => {
      expect(player.location).toEqual(playerLocation);
      town.teleportToFriend(teleportRequest);
      expect(player.location).toEqual(playerLocation);
    });
  });
  describe('inviteToConversationArea', () => {
    it('Emits a conversationAreaRequestSent when called.', () => {
      town.inviteToConversationArea(conversationRequest.requester, conversationRequest.requested);
      expect(townEmitter.emit).toBeCalledWith('conversationAreaRequestSent', conversationRequest);
    });
    it('Adds the request from the instigator to the invited friends conversation area requests', () => {
      expect(player2.conversationAreaInvites.length).toBe(0);
      town.inviteToConversationArea(conversationRequest.requester, conversationRequest.requested);
      expect(player2.conversationAreaInvites.length).toBe(1);
    });
    it('Does not move the requester or requested', () => {
      expect(player.location).toEqual(playerLocation);
      expect(player2.location).toEqual(player2Location);
      town.inviteToConversationArea(conversationRequest.requester, conversationRequest.requested);
      expect(player.location).toEqual(playerLocation);
      expect(player2.location).toEqual(player2Location);
    });
    it('Does not add a second request when the same one has already been made.', () => {
      expect(player2.conversationAreaInvites.length).toBe(0);
      town.inviteToConversationArea(conversationRequest.requester, conversationRequest.requested);
      town.inviteToConversationArea(conversationRequest.requester, conversationRequest.requested);
      expect(player2.conversationAreaInvites.length).toBe(1);
    });
  });
  describe('acceptConversationAreaInvite', () => {
    it('Emits a conversationAreaRequestAccepted when called.', () => {
      town.inviteToConversationArea(conversationRequest.requester, conversationRequest.requested);
      town.acceptConversationAreaInvite(teleportRequest);
      expect(townEmitter.emit).toBeCalledWith('conversationAreaRequestAccepted', teleportRequest);
    });
    it('Transports the requested player to the requesters location', () => {
      town.inviteToConversationArea(conversationRequest.requester, conversationRequest.requested);
      expect(player2.location).toEqual(player2Location);
      town.acceptConversationAreaInvite(teleportRequest);
      expect(player2.location).toEqual(playerLocation);
    });
    it('Does not move the requester', () => {
      town.inviteToConversationArea(conversationRequest.requester, conversationRequest.requested);
      expect(player.location).toEqual(playerLocation);
      town.acceptConversationAreaInvite(teleportRequest);
      expect(player.location).toEqual(playerLocation);
    });
    it('Removes the request from the requested players conversation area requests list.', () => {
      town.inviteToConversationArea(conversationRequest.requester, conversationRequest.requested);
      expect(player2.conversationAreaInvites.length).toEqual(1);
      town.acceptConversationAreaInvite(teleportRequest);
      expect(player2.conversationAreaInvites.length).toEqual(0);
    });
    it('Player should be sent to OG location, even when other player moves in the meantime', () => {
      town.inviteToConversationArea(player, [player2]);
      player.location.x = 0;
      player.location.y = 0;
      town.acceptConversationAreaInvite(player2.conversationAreaInvites[0]);
      expect(player2.location).toEqual(playerLocation);
    });
  });
  describe('declineConversationAreaInvite', () => {
    it('Emits a conversationAreaRequestDeclined when called.', () => {
      town.inviteToConversationArea(conversationRequest.requester, conversationRequest.requested);
      town.declineConversationAreaInvite(teleportRequest.requester, teleportRequest.requested);
      expect(townEmitter.emit).toBeCalledWith('conversationAreaRequestDeclined', teleportRequest);
    });
    it('Does not transport the requested player to the requesters location', () => {
      town.inviteToConversationArea(conversationRequest.requester, conversationRequest.requested);
      expect(player2.location).toEqual(player2Location);
      town.declineConversationAreaInvite(teleportRequest.requester, teleportRequest.requested);
      expect(player2.location).toEqual(player2Location);
    });
    it('Does not move the requester', () => {
      town.inviteToConversationArea(conversationRequest.requester, conversationRequest.requested);
      expect(player.location).toEqual(playerLocation);
      town.declineConversationAreaInvite(teleportRequest.requester, teleportRequest.requested);
      expect(player.location).toEqual(playerLocation);
    });
    it('Removes the request from the requested players conversation area requests list.', () => {
      town.inviteToConversationArea(conversationRequest.requester, conversationRequest.requested);
      expect(player2.conversationAreaInvites.length).toEqual(1);
      town.declineConversationAreaInvite(teleportRequest.requester, teleportRequest.requested);
      expect(player2.conversationAreaInvites.length).toEqual(0);
    });
  });
});
