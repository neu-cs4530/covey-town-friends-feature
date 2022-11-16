import { cleanup, render, RenderResult } from '@testing-library/react';
import { MockProxy } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import * as React from 'react';
import Player from '../../../townService/src/lib/Player';
import { MockedPlayer, mockPlayer } from '../../../townService/src/TestUtils';
import { act } from 'react-dom/test-utils';
import ConversationAreaController, {
  ConversationAreaEvents,
  NO_TOPIC_STRING,
  useConversationAreaOccupants,
  useConversationAreaTopic,
} from '../classes/ConversationAreaController';
import PlayerController from '../classes/PlayerController';
import TownController, {
  TownEvents,
  useActiveConversationAreas,
  useCurrentPlayerFriendRequests,
  usePendingConversationAreaInvites,
  usePlayers,
  useTownSettings,
  useCurrentPlayerFriends,
  useSelectedFriends,
  useLatestBriefMessage,
} from '../classes/TownController';
import { EventNames, getTownEventListener, mockTownController } from '../TestUtils';
import {
  BriefMessage,
  PlayerLocation,
  PlayerToPlayerUpdate,
  TeleportInviteSingular,
} from '../types/CoveyTownSocket';
import * as useTownController from './useTownController';
describe('[T3] TownController-Dependent Hooks', () => {
  let useTownControllerSpy: jest.SpyInstance<TownController, []>;
  let townController: MockProxy<TownController>;

  // Data to test some of our Final Project hooks:
  let players: PlayerController[];
  let player1: Player;
  let player2: Player;
  let player3: Player;
  let playerTestData1: MockedPlayer;
  let playerTestData2: MockedPlayer;
  let playerTestData3: MockedPlayer;

  beforeAll(() => {
    useTownControllerSpy = jest.spyOn(useTownController, 'default');
  });
  function getSingleListenerRemoved<Ev extends EventNames<TownEvents>>(
    eventName: Ev,
  ): TownEvents[Ev] {
    const listeners = townController.removeListener.mock.calls.filter(
      eachCall => eachCall[0] === eventName,
    );
    if (listeners.length !== 1) {
      throw new Error(
        `Expected to find exactly one removeListener call for ${eventName}, but found ${listeners.length}`,
      );
    }
    return listeners[0][1] as unknown as TownEvents[Ev];
  }
  function getSingleListenerAdded<Ev extends EventNames<TownEvents>>(
    eventName: Ev,
    spy = townController.addListener,
  ): TownEvents[Ev] {
    const listeners = spy.mock.calls.filter(eachCall => eachCall[0] === eventName);
    if (listeners.length !== 1) {
      throw new Error(
        `Expected to find exactly one addListener call for ${eventName}, but found ${listeners.length}`,
      );
    }
    return listeners[0][1] as unknown as TownEvents[Ev];
  }
  describe('[T3] usePlayers', () => {
    let friendlyName: string;
    let townIsPubliclyListed: boolean;
    let hookReturnValue: PlayerController[];
    let renderData: RenderResult;
    function TestComponent() {
      hookReturnValue = usePlayers();
      return null;
    }
    beforeEach(() => {
      friendlyName = nanoid();
      townIsPubliclyListed = true;
      townController = mockTownController({
        friendlyName,
        townIsPubliclyListed,
        players,
      });
      useTownControllerSpy.mockReturnValue(townController);

      renderData = render(<TestComponent />);
    });
    it('Returns initial state for the town', () => {
      expect(hookReturnValue).toEqual(players);
    });
    it('Updates players in response to playersChanged events', () => {
      const listener = getSingleListenerAdded('playersChanged');
      act(() => {
        listener([]);
      });
      expect(hookReturnValue).toEqual([]);
      act(() => {
        listener(players);
      });
      expect(hookReturnValue).toEqual(players);
    });
    it('Adds exactly one listener', () => {
      const listener = getSingleListenerAdded('playersChanged');
      act(() => {
        listener([]);
      });
      getSingleListenerAdded('playersChanged');
    });
    it('Removes the listener when the component is unmounted', () => {
      const listenerAdded = getSingleListenerAdded('playersChanged');
      act(() => {
        listenerAdded([]);
      });
      cleanup();
      const listenerRemoved = getSingleListenerRemoved('playersChanged');
      expect(listenerRemoved).toBe(listenerAdded);
    });
    it('Adds a listener on first render and does not re-register a listener on each render', () => {
      getSingleListenerAdded('playersChanged');
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      getSingleListenerAdded('playersChanged');
    });

    it('Removes the listener if the townController changes and adds one to the new controller', () => {
      const addCall = getSingleListenerAdded('playersChanged');
      const newController = mockTownController({
        friendlyName: nanoid(),
        townID: nanoid(),
        players: [],
      });

      useTownControllerSpy.mockReturnValue(newController);
      renderData.rerender(<TestComponent />);
      expect(getSingleListenerRemoved('playersChanged')).toBe(addCall);

      getSingleListenerAdded('playersChanged', newController.addListener);
    });
  });
  describe('[T3] useActiveConversationAreas', () => {
    let conversationAreas: ConversationAreaController[];

    let hookReturnValue: ConversationAreaController[] = [];
    let renderData: RenderResult;

    function TestComponent() {
      hookReturnValue = useActiveConversationAreas();
      return null;
    }
    beforeEach(() => {
      conversationAreas = [];
      players = [];

      for (let i = 0; i < 10; i++) {
        conversationAreas.push(new ConversationAreaController(nanoid(), `topic${i}`));
      }

      for (let i = 0; i < 10; i++) {
        players.push(
          new PlayerController(nanoid(), nanoid(), { moving: false, rotation: 'back', x: 0, y: 1 }),
        );
      }

      conversationAreas[0].occupants.push(players[0]);
      conversationAreas[1].occupants.push(players[1]);

      townController = mockTownController({
        conversationAreas,
      });
      useTownControllerSpy.mockReturnValue(townController);

      renderData = render(<TestComponent />);
    });
    it('Returns an initial state of the active conversation areas', () => {
      hookReturnValue.sort((a, b) => (a.topic && b.topic ? a.topic.localeCompare(b.topic) : 0));
      expect(hookReturnValue).toEqual([conversationAreas[0], conversationAreas[1]]);
    });
    it('Updates its value in response to conversationAreasChanged events', () => {
      act(() => {
        const listener = getSingleListenerAdded('conversationAreasChanged');
        conversationAreas[2].occupants.push(players[2]);
        listener(conversationAreas);
      });
      hookReturnValue.sort((a, b) => (a.topic && b.topic ? a.topic.localeCompare(b.topic) : 0));
      expect(hookReturnValue).toEqual([
        conversationAreas[0],
        conversationAreas[1],
        conversationAreas[2],
      ]);
    });
    it('Only adds a listener once', () => {
      // Check that there was one listener added
      getSingleListenerAdded('conversationAreasChanged');
      // Trigger re-render
      act(() => {
        const listener = getTownEventListener(townController, 'conversationAreasChanged');
        conversationAreas[2].occupants.push(players[2]);
        listener(conversationAreas);
      });
      renderData.rerender(<TestComponent />);
      // Should still be one
      getSingleListenerAdded('conversationAreasChanged');
    });
    it('Removes the listener when the component is unmounted', () => {
      const addCall = getSingleListenerAdded('conversationAreasChanged');
      cleanup();
      const removeCall = getSingleListenerRemoved('conversationAreasChanged');
      expect(addCall).toBe(removeCall);
    });
    it('Adds a listener on first render and does not re-register a listener on each render', () => {
      getSingleListenerAdded('conversationAreasChanged');
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      getSingleListenerAdded('conversationAreasChanged');
    });

    it('Removes the listener if the townController changes and adds one to the new controller', () => {
      const addCall = getSingleListenerAdded('conversationAreasChanged');
      const newController = mockTownController({
        friendlyName: nanoid(),
        townID: nanoid(),
        conversationAreas: [],
      });

      useTownControllerSpy.mockReturnValue(newController);
      renderData.rerender(<TestComponent />);
      expect(getSingleListenerRemoved('conversationAreasChanged')).toBe(addCall);

      getSingleListenerAdded('conversationAreasChanged', newController.addListener);
    });
  });

  describe('usePendingConversationAreaRequests', () => {
    let conversationAreaInvites: TeleportInviteSingular[];

    let hookReturnValue: TeleportInviteSingular[] = [];
    let renderData: RenderResult;
    let player1ID: string;
    let player2ID: string;
    let player3ID: string;

    let player1Location: PlayerLocation;
    let player2Location: PlayerLocation;
    let player3Location: PlayerLocation;
    let teleportInvite1: TeleportInviteSingular;
    let teleportInvite2: TeleportInviteSingular;

    function TestComponent() {
      hookReturnValue = usePendingConversationAreaInvites();
      return null;
    }

    beforeEach(() => {
      conversationAreaInvites = [];

      townController = mockTownController({
        conversationAreaInvites,
      });
      useTownControllerSpy.mockReturnValue(townController);
      player1ID = '001';
      player2ID = '002';
      player3ID = '003';

      // Push conversation area invites with requested = townController.ourPlayer
      teleportInvite1 = {
        requester: player1ID,
        requested: townController.ourPlayer.id,
        requesterLocation: player1Location,
      };
      teleportInvite2 = {
        requester: player2ID,
        requested: townController.ourPlayer.id,
        requesterLocation: player2Location,
      };
      conversationAreaInvites.push(teleportInvite1);
      conversationAreaInvites.push(teleportInvite2);

      renderData = render(<TestComponent />);
    });
    it('Returns an initial state of the pending conversation area requests', () => {
      hookReturnValue.sort((a, b) =>
        a.requester && b.requester ? a.requester.localeCompare(b.requester) : 0,
      );
      expect(hookReturnValue).toEqual([teleportInvite1, teleportInvite2]);
    });
    it('Updates its value in response to conversationAreaInvitesChanged events', () => {
      act(() => {
        const listener = getSingleListenerAdded('conversationAreaInvitesChanged');
        conversationAreaInvites.push({
          requester: player3ID,
          requested: townController.ourPlayer.id,
          requesterLocation: player3Location,
        });
        listener(conversationAreaInvites);
      });
      hookReturnValue.sort((a, b) =>
        a.requester && b.requester ? a.requester.localeCompare(b.requester) : 0,
      );
      expect(hookReturnValue).toEqual([
        teleportInvite1,
        teleportInvite2,
        {
          requester: player3ID,
          requested: townController.ourPlayer.id,
          requesterLocation: player3Location,
        },
      ]);
    });
    it('Only adds a listener once', () => {
      // Check that there was one listener added
      getSingleListenerAdded('conversationAreaInvitesChanged');
      // Trigger re-render
      act(() => {
        const listener = getTownEventListener(townController, 'conversationAreaInvitesChanged');
        conversationAreaInvites.push({
          requester: player3ID,
          requested: townController.ourPlayer.id,
          requesterLocation: player3Location,
        });
        listener(conversationAreaInvites);
      });
      renderData.rerender(<TestComponent />);
      // Should still be one
      getSingleListenerAdded('conversationAreaInvitesChanged');
    });
    it('Removes the listener when the component is unmounted', () => {
      const addCall = getSingleListenerAdded('conversationAreaInvitesChanged');
      cleanup();
      const removeCall = getSingleListenerRemoved('conversationAreaInvitesChanged');
      expect(addCall).toBe(removeCall);
    });
    it('Adds a listener on first render and does not re-register a listener on each render', () => {
      getSingleListenerAdded('conversationAreaInvitesChanged');
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      getSingleListenerAdded('conversationAreaInvitesChanged');
    });
    it('Removes the listener if the townController changes and adds one to the new controller', () => {
      const addCall = getSingleListenerAdded('conversationAreaInvitesChanged');
      const newController = mockTownController({
        friendlyName: nanoid(),
        townID: nanoid(),
        conversationAreas: [],
      });

      useTownControllerSpy.mockReturnValue(newController);
      renderData.rerender(<TestComponent />);
      expect(getSingleListenerRemoved('conversationAreaInvitesChanged')).toBe(addCall);

      getSingleListenerAdded('conversationAreaInvitesChanged', newController.addListener);
    });
  });

  describe('useCurrentPlayerFriendRequests', () => {
    let playerFriendRequests: PlayerToPlayerUpdate[];

    let hookReturnValue: PlayerToPlayerUpdate[] = [];
    let renderData: RenderResult;

    let request1: PlayerToPlayerUpdate;
    let request2: PlayerToPlayerUpdate;

    function TestComponent() {
      hookReturnValue = useCurrentPlayerFriendRequests();
      return null;
    }

    beforeEach(() => {
      playerFriendRequests = [];

      townController = mockTownController({
        playerFriendRequests,
      });
      useTownControllerSpy.mockReturnValue(townController);
      playerTestData1 = mockPlayer(townController.townID);
      playerTestData2 = mockPlayer(townController.townID);
      playerTestData3 = mockPlayer(townController.townID);
      player1 = playerTestData1.player as Player;
      player2 = playerTestData2.player as Player;
      player3 = playerTestData3.player as Player;

      // Push conversation area invites with requested = townController.ourPlayer
      request1 = {
        actor: playerTestData1.id,
        affected: townController.ourPlayer.id,
      };
      request2 = {
        actor: townController.ourPlayer.id,
        affected: playerTestData2.id,
      };
      playerFriendRequests.push(request1);
      playerFriendRequests.push(request2);

      renderData = render(<TestComponent />);
    });
    it('Returns an initial state of the current player friend requests', () => {
      hookReturnValue.sort((a, b) => (a.actor && b.actor ? a.actor.localeCompare(b.actor) : 0));
      expect(hookReturnValue).toEqual([request1, request2]);
    });
    it('Updates its value in response to playerFriendRequestsChanged events', () => {
      act(() => {
        const listener = getSingleListenerAdded('playerFriendRequestsChanged');
        playerFriendRequests.push({
          actor: playerTestData3.id,
          affected: townController.ourPlayer.id,
        });
        listener(playerFriendRequests);
      });
      hookReturnValue.sort((a, b) => (a.actor && b.actor ? a.actor.localeCompare(b.actor) : 0));
      expect(hookReturnValue).toEqual([
        request1,
        request2,
        {
          actor: playerTestData3.id,
          affected: townController.ourPlayer.id,
        },
      ]);
    });
    it('Only adds a listener once', () => {
      // Check that there was one listener added
      getSingleListenerAdded('playerFriendRequestsChanged');
      // Trigger re-render
      act(() => {
        const listener = getTownEventListener(townController, 'playerFriendRequestsChanged');
        playerFriendRequests.push({
          actor: playerTestData3.id,
          affected: townController.ourPlayer.id,
        });
        listener(playerFriendRequests);
      });
      renderData.rerender(<TestComponent />);
      // Should still be one
      getSingleListenerAdded('playerFriendRequestsChanged');
    });
    it('Removes the listener when the component is unmounted', () => {
      const addCall = getSingleListenerAdded('playerFriendRequestsChanged');
      cleanup();
      const removeCall = getSingleListenerRemoved('playerFriendRequestsChanged');
      expect(addCall).toBe(removeCall);
    });
    it('Adds a listener on first render and does not re-register a listener on each render', () => {
      getSingleListenerAdded('playerFriendRequestsChanged');
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      getSingleListenerAdded('playerFriendRequestsChanged');
    });
    it('Removes the listener if the townController changes and adds one to the new controller', () => {
      const addCall = getSingleListenerAdded('playerFriendRequestsChanged');
      const newController = mockTownController({
        friendlyName: nanoid(),
        townID: nanoid(),
        conversationAreas: [],
      });

      useTownControllerSpy.mockReturnValue(newController);
      renderData.rerender(<TestComponent />);
      expect(getSingleListenerRemoved('playerFriendRequestsChanged')).toBe(addCall);

      getSingleListenerAdded('playerFriendRequestsChanged', newController.addListener);
    });
  });

  describe('useCurrentPlayerFriends', () => {
    let renderData: RenderResult;
    let playerFriends: PlayerController[];
    let friend1: PlayerController;
    let hookReturnValue: PlayerController[] = [];
    function TestComponent() {
      hookReturnValue = useCurrentPlayerFriends();
      return null;
    }
    beforeEach(() => {
      playerFriends = [];
      townController = mockTownController({
        playerFriends,
      });
      for (let i = 0; i < 3; i++) {
        playerFriends.push(
          new PlayerController(nanoid(), nanoid(), { moving: false, rotation: 'back', x: 0, y: 1 }),
        );
      }
      friend1 = new PlayerController(nanoid(), nanoid(), {
        moving: false,
        rotation: 'back',
        x: 0,
        y: 1,
      });
      useTownControllerSpy.mockReturnValue(townController);
      renderData = render(<TestComponent />);
    });
    it('Returns an initial state of the current player friends', () => {
      hookReturnValue.sort((a, b) => (a.id && b.id ? a.id.localeCompare(b.id) : 0));
      expect(hookReturnValue).toEqual([playerFriends[0], playerFriends[1], playerFriends[2]]);
    });
    it('Updates its value in response to playerFriendRequestsChanged events', () => {
      act(() => {
        const listener = getSingleListenerAdded('playerFriendsChanged');
        playerFriends.push(friend1);
        listener(playerFriends);
      });
      expect(hookReturnValue).toEqual([
        playerFriends[0],
        playerFriends[1],
        playerFriends[2],
        friend1,
      ]);
    });
    it('Only adds a listener once', () => {
      // Check that there was one listener added
      getSingleListenerAdded('playerFriendsChanged');
      // Trigger re-render
      act(() => {
        const listener = getTownEventListener(townController, 'playerFriendsChanged');
        playerFriends.push(friend1);
        listener(playerFriends);
      });
      renderData.rerender(<TestComponent />);
      // Should still be one
      getSingleListenerAdded('playerFriendsChanged');
    });
    it('Removes the listener when the component is unmounted', () => {
      const addCall = getSingleListenerAdded('playerFriendsChanged');
      cleanup();
      const removeCall = getSingleListenerRemoved('playerFriendsChanged');
      expect(addCall).toBe(removeCall);
    });
    it('Adds a listener on first render and does not re-register a listener on each render', () => {
      getSingleListenerAdded('playerFriendsChanged');
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      getSingleListenerAdded('playerFriendsChanged');
    });
    it('Removes the listener if the townController changes and adds one to the new controller', () => {
      const addCall = getSingleListenerAdded('playerFriendsChanged');
      const newController = mockTownController({
        friendlyName: nanoid(),
        townID: nanoid(),
        conversationAreas: [],
      });
      useTownControllerSpy.mockReturnValue(newController);
      renderData.rerender(<TestComponent />);
      expect(getSingleListenerRemoved('playerFriendsChanged')).toBe(addCall);
      getSingleListenerAdded('playerFriendsChanged', newController.addListener);
    });
  });

  describe('useSelectedFriends', () => {
    let renderData: RenderResult;
    let playerFriends: PlayerController[];
    let selectedFriends: PlayerController[];
    let friend1: PlayerController;
    let hookReturnValue: PlayerController[] = [];
    function TestComponent() {
      hookReturnValue = useSelectedFriends();
      return null;
    }
    beforeEach(() => {
      playerFriends = [];
      selectedFriends = [];

      townController = mockTownController({
        playerFriends,
        selectedFriends,
      });

      // add four friends to friends list
      for (let i = 0; i < 3; i++) {
        playerFriends.push(
          new PlayerController(nanoid(), nanoid(), { moving: false, rotation: 'back', x: 0, y: 1 }),
        );
      }
      friend1 = new PlayerController(nanoid(), nanoid(), {
        moving: false,
        rotation: 'back',
        x: 0,
        y: 1,
      });
      playerFriends.push(friend1);

      useTownControllerSpy.mockReturnValue(townController);
      renderData = render(<TestComponent />);
    });
    it('Returns an initial state of the current selected friends', () => {
      hookReturnValue.sort((a, b) => (a.id && b.id ? a.id.localeCompare(b.id) : 0));
      expect(hookReturnValue).toEqual([]);
    });
    it('Updates its value in response to selectedFriendsChanged events', () => {
      act(() => {
        const listener = getSingleListenerAdded('selectedFriendsChanged');

        // select friend 1
        townController.selectedFriends.push(friend1);
        listener(selectedFriends);
      });
      expect(hookReturnValue).toEqual([friend1]);

      townController.selectedFriends.push(playerFriends[0]);
      expect(hookReturnValue).toEqual([friend1, playerFriends[0]]);

      townController.selectedFriends.pop();
      expect(hookReturnValue).toEqual([friend1]);

      townController.selectedFriends.pop();
      expect(hookReturnValue).toEqual([]);
    });
    it('Only adds a listener once', () => {
      // Check that there was one listener added
      getSingleListenerAdded('selectedFriendsChanged');
      // Trigger re-render
      act(() => {
        const listener = getTownEventListener(townController, 'selectedFriendsChanged');
        // select friend 1
        townController.selectedFriends.push(friend1);
        listener(selectedFriends);
      });
      renderData.rerender(<TestComponent />);
      // Should still be one
      getSingleListenerAdded('selectedFriendsChanged');
    });
    it('Removes the listener when the component is unmounted', () => {
      const addCall = getSingleListenerAdded('selectedFriendsChanged');
      cleanup();
      const removeCall = getSingleListenerRemoved('selectedFriendsChanged');
      expect(addCall).toBe(removeCall);
    });
    it('Adds a listener on first render and does not re-register a listener on each render', () => {
      getSingleListenerAdded('selectedFriendsChanged');
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      getSingleListenerAdded('selectedFriendsChanged');
    });
    it('Removes the listener if the townController changes and adds one to the new controller', () => {
      const addCall = getSingleListenerAdded('selectedFriendsChanged');
      const newController = mockTownController({
        friendlyName: nanoid(),
        townID: nanoid(),
        conversationAreas: [],
      });
      useTownControllerSpy.mockReturnValue(newController);
      renderData.rerender(<TestComponent />);
      expect(getSingleListenerRemoved('selectedFriendsChanged')).toBe(addCall);
      getSingleListenerAdded('selectedFriendsChanged', newController.addListener);
    });
  });
  describe('useLatestBriefMessage', () => {
    let friendlyName: string;
    let townIsPubliclyListed: boolean;
    let hookReturnValue: BriefMessage | undefined;
    let renderData: RenderResult;
    function TestComponent() {
      hookReturnValue = useLatestBriefMessage();
      return null;
    }
    let player1ID;
    let player2ID;
    let player3ID;
    let firstMessageToPlayer1: BriefMessage;
    let secondMessageToPlayer1: BriefMessage;

    beforeEach(() => {
      friendlyName = nanoid();
      townIsPubliclyListed = true;
      townController = mockTownController({
        friendlyName,
        townIsPubliclyListed,
        players,
      });
      useTownControllerSpy.mockReturnValue(townController);
      player1ID = '001';
      player2ID = '002';
      player3ID = '003';

      firstMessageToPlayer1 = {
        sender: player2ID,
        recipients: [player1ID, player3ID],
        body: nanoid(),
      };
      secondMessageToPlayer1 = {
        sender: player3ID,
        recipients: [player1ID],
        body: nanoid(),
      };

      renderData = render(<TestComponent />);
    });
    it('Returns initial state of latestBriefMessage for the town', () => {
      expect(hookReturnValue).toEqual(undefined);
    });
    it('Updates latestBriefMessage in response to latestBriefMessageChanged events', () => {
      const listener = getSingleListenerAdded('latestBriefMessageChanged');
      act(() => {
        listener(firstMessageToPlayer1);
      });
      expect(hookReturnValue).toEqual(firstMessageToPlayer1);
      act(() => {
        listener(secondMessageToPlayer1);
      });
      expect(hookReturnValue).toEqual(secondMessageToPlayer1);
    });
    it('Adds exactly one listener', () => {
      const listener = getSingleListenerAdded('latestBriefMessageChanged');
      act(() => {
        listener(firstMessageToPlayer1);
      });
      getSingleListenerAdded('latestBriefMessageChanged');
    });
    it('Removes the listener when the component is unmounted', () => {
      const listenerAdded = getSingleListenerAdded('latestBriefMessageChanged');
      act(() => {
        listenerAdded(firstMessageToPlayer1);
      });
      cleanup();
      const listenerRemoved = getSingleListenerRemoved('latestBriefMessageChanged');
      expect(listenerRemoved).toBe(listenerAdded);
    });
    it('Adds a listener on first render and does not re-register a listener on each render', () => {
      getSingleListenerAdded('latestBriefMessageChanged');
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      getSingleListenerAdded('latestBriefMessageChanged');
    });

    it('Removes the listener if the townController changes and adds one to the new controller', () => {
      const addCall = getSingleListenerAdded('latestBriefMessageChanged');
      const newController = mockTownController({
        friendlyName: nanoid(),
        townID: nanoid(),
        players: [],
      });

      useTownControllerSpy.mockReturnValue(newController);
      renderData.rerender(<TestComponent />);
      expect(getSingleListenerRemoved('latestBriefMessageChanged')).toBe(addCall);

      getSingleListenerAdded('latestBriefMessageChanged', newController.addListener);
    });
  });
  describe('[T3] useTownSettings', () => {
    let friendlyName: string;
    let townIsPubliclyListed: boolean;
    let hookReturnValue: { friendlyName: string; isPubliclyListed: boolean };
    let renderData: RenderResult;
    function TestComponent() {
      hookReturnValue = useTownSettings();
      return null;
    }
    beforeEach(() => {
      friendlyName = nanoid();
      townIsPubliclyListed = true;
      townController = mockTownController({
        friendlyName,
        townIsPubliclyListed,
      });
      useTownControllerSpy.mockReturnValue(townController);

      renderData = render(<TestComponent />);
    });
    it('Returns initial state for the town', () => {
      expect(hookReturnValue.isPubliclyListed).toBe(townIsPubliclyListed);
      expect(hookReturnValue.friendlyName).toBe(friendlyName);
    });
    it('Updates isPubliclyListed in response to townSettingsUpdated events', () => {
      const listener = getSingleListenerAdded('townSettingsUpdated');
      const newTownIsPubliclyListed = false;
      act(() => {
        listener({ isPubliclyListed: newTownIsPubliclyListed });
      });
      expect(hookReturnValue.friendlyName).toBe(friendlyName);
      expect(hookReturnValue.isPubliclyListed).toBe(newTownIsPubliclyListed);
    });
    it('Updates friendlyName in response to townSettingsUpdated events', () => {
      const listener = getSingleListenerAdded('townSettingsUpdated');
      const newFriendlyName = nanoid();
      act(() => {
        listener({ friendlyName: newFriendlyName });
      });
      expect(hookReturnValue.friendlyName).toBe(newFriendlyName);
      expect(hookReturnValue.isPubliclyListed).toBe(townIsPubliclyListed);
    });
    it('Updates both settings in response to townSettingsUpdated events', () => {
      const listener = getSingleListenerAdded('townSettingsUpdated');
      const newFriendlyName = nanoid();
      const newTownIsPubliclyListed = false;
      act(() => {
        listener({ friendlyName: newFriendlyName, isPubliclyListed: newTownIsPubliclyListed });
      });
      expect(hookReturnValue.friendlyName).toBe(newFriendlyName);
      expect(hookReturnValue.isPubliclyListed).toBe(newTownIsPubliclyListed);
    });
    it('Adds exactly one listener', () => {
      const listener = getSingleListenerAdded('townSettingsUpdated');
      const newFriendlyName = nanoid();
      const newTownIsPubliclyListed = false;
      act(() => {
        listener({ friendlyName: newFriendlyName, isPubliclyListed: newTownIsPubliclyListed });
      });
      getSingleListenerAdded('townSettingsUpdated');
    });
    it('Removes the listener when the component is unmounted', () => {
      const listenerAdded = getSingleListenerAdded('townSettingsUpdated');
      const newFriendlyName = nanoid();
      const newTownIsPubliclyListed = false;
      act(() => {
        listenerAdded({ friendlyName: newFriendlyName, isPubliclyListed: newTownIsPubliclyListed });
      });
      cleanup();
      const listenerRemoved = getSingleListenerRemoved('townSettingsUpdated');
      expect(listenerRemoved).toBe(listenerAdded);
    });
    it('Adds a listener on first render and does not re-register a listener on each render', () => {
      getSingleListenerAdded('townSettingsUpdated');
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      getSingleListenerAdded('townSettingsUpdated');
    });

    it('Removes the listener if the townController changes and adds one to the new controller', () => {
      const addCall = getSingleListenerAdded('townSettingsUpdated');
      const newController = mockTownController({
        friendlyName: nanoid(),
        townID: nanoid(),
        conversationAreas: [],
      });

      useTownControllerSpy.mockReturnValue(newController);
      renderData.rerender(<TestComponent />);
      expect(getSingleListenerRemoved('townSettingsUpdated')).toBe(addCall);

      getSingleListenerAdded('townSettingsUpdated', newController.addListener);
    });
  });
});

describe('ConversationAreaController hooks', () => {
  let conversationAreaController: ConversationAreaController;
  type ConversationAreaEventName = keyof ConversationAreaEvents;

  let addListenerSpy: jest.SpyInstance<
    ConversationAreaController,
    [event: ConversationAreaEventName, listener: ConversationAreaEvents[ConversationAreaEventName]]
  >;

  let removeListenerSpy: jest.SpyInstance<
    ConversationAreaController,
    [event: ConversationAreaEventName, listener: ConversationAreaEvents[ConversationAreaEventName]]
  >;

  beforeEach(() => {
    conversationAreaController = new ConversationAreaController(nanoid(), nanoid());
    addListenerSpy = jest.spyOn(conversationAreaController, 'addListener');
    removeListenerSpy = jest.spyOn(conversationAreaController, 'removeListener');
  });
  function getSingleListenerAdded<Ev extends EventNames<ConversationAreaEvents>>(
    eventName: Ev,
    spy = addListenerSpy,
  ): ConversationAreaEvents[Ev] {
    const addedListeners = spy.mock.calls.filter(eachCall => eachCall[0] === eventName);
    if (addedListeners.length !== 1) {
      throw new Error(
        `Expected to find exactly one addListener call for ${eventName} but found ${addedListeners.length}`,
      );
    }
    return addedListeners[0][1] as unknown as ConversationAreaEvents[Ev];
  }
  function getSingleListenerRemoved<Ev extends EventNames<ConversationAreaEvents>>(
    eventName: Ev,
  ): ConversationAreaEvents[Ev] {
    const removedListeners = removeListenerSpy.mock.calls.filter(
      eachCall => eachCall[0] === eventName,
    );
    if (removedListeners.length !== 1) {
      throw new Error(
        `Expected to find exactly one removeListeners call for ${eventName} but found ${removedListeners.length}`,
      );
    }
    return removedListeners[0][1] as unknown as ConversationAreaEvents[Ev];
  }
  describe('[T3] useConversationAreaOccupants', () => {
    let hookReturnValue: PlayerController[];
    let testPlayers: PlayerController[];
    let renderData: RenderResult;
    function TestComponent(props: { controller?: ConversationAreaController }) {
      hookReturnValue = useConversationAreaOccupants(
        props.controller || conversationAreaController,
      );
      return null;
    }
    beforeEach(() => {
      testPlayers = [];
      for (let i = 0; i < 10; i++) {
        testPlayers.push(
          new PlayerController(nanoid(), nanoid(), { moving: false, rotation: 'back', x: 0, y: 1 }),
        );
      }
      conversationAreaController.occupants = [testPlayers[0], testPlayers[1], testPlayers[2]];
      renderData = render(<TestComponent />);
    });
    it('Returns an initial state of the players in the area', () => {
      expect(hookReturnValue).toEqual([testPlayers[0], testPlayers[1], testPlayers[2]]);
    });
    it('Updates the occupants list in response to occupantsChange events', () => {
      act(() => {
        conversationAreaController.occupants = [testPlayers[0]];
      });
      expect(hookReturnValue).toEqual([testPlayers[0]]);
      //Make sure that re-rendering didn't add another listener
      getSingleListenerAdded('occupantsChange');
    });
    it('Removes its update listener when the component unmounts', () => {
      const listenerAdded = getSingleListenerAdded('occupantsChange');
      cleanup();
      const listenerRemoved = getSingleListenerRemoved('occupantsChange');
      expect(listenerAdded).toBe(listenerRemoved);
    });
    it('Adds a listener on first render and does not re-register a listener on each render', () => {
      getSingleListenerAdded('occupantsChange');
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      getSingleListenerAdded('occupantsChange');
    });
    it('Removes its listener and registers a new one if the area changes', () => {
      const added = getSingleListenerAdded('occupantsChange');

      const newController = new ConversationAreaController(nanoid(), nanoid());
      const newAdded = jest.spyOn(newController, 'addListener');

      renderData.rerender(<TestComponent controller={newController} />);

      //Make sure old was removed
      expect(getSingleListenerRemoved('occupantsChange')).toBe(added);

      //Make sure new added
      getSingleListenerAdded('occupantsChange', newAdded);
    });
  });
  describe('[T3] useConversationAreaTopic', () => {
    let hookReturnValue: string;
    let renderData: RenderResult;
    function TestComponent(props: { controller?: ConversationAreaController }) {
      hookReturnValue = useConversationAreaTopic(props.controller || conversationAreaController);
      return null;
    }
    beforeEach(() => {
      renderData = render(<TestComponent />);
    });
    it('Returns an initial state of the topic for the area', () => {
      expect(hookReturnValue).toEqual(conversationAreaController.topic);
    });
    it('Returns NO_TOPIC_STRING if the topic is undefined', () => {
      act(() => {
        conversationAreaController.topic = undefined;
      });
      expect(hookReturnValue).toEqual(NO_TOPIC_STRING);
    });
    it('Updates the topic in response to topicChange events', () => {
      const newTopic = nanoid();
      act(() => {
        conversationAreaController.topic = newTopic;
      });
      expect(hookReturnValue).toEqual(newTopic);
      // Make sure that re-rendering didn't add another listener
      getSingleListenerAdded('topicChange');
    });
    it('Removes its update listener when the component unmounts', () => {
      const listenerAdded = getSingleListenerAdded('topicChange');
      cleanup();
      const listenerRemoved = getSingleListenerRemoved('topicChange');
      expect(listenerRemoved).toBe(listenerAdded);
    });
    it('Adds a listener on first render and does not re-register a listener on each render', () => {
      getSingleListenerAdded('topicChange');
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      renderData.rerender(<TestComponent />);
      getSingleListenerAdded('topicChange');
    });
    it('Removes its listener and registers a new one if the area changes', () => {
      const added = getSingleListenerAdded('topicChange');

      const newController = new ConversationAreaController(nanoid(), nanoid());
      const newAdded = jest.spyOn(newController, 'addListener');

      renderData.rerender(<TestComponent controller={newController} />);

      //Make sure old was removed
      expect(getSingleListenerRemoved('topicChange')).toBe(added);

      //Make sure new added
      getSingleListenerAdded('topicChange', newAdded);
    });
  });
});
