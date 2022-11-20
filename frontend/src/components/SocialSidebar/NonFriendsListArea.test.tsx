import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';
import { nanoid } from 'nanoid';
import React from 'react';
import TownController, * as TownControllerHooks from '../../classes/TownController';
import PlayerController from '../../classes/PlayerController';
import * as useTownController from '../../hooks/useTownController';
import { mockTownController } from '../../TestUtils';
import { Player, PlayerLocation, PlayerToPlayerUpdate } from '../../types/CoveyTownSocket';
import * as PlayerName from './PlayerName';
import PlayersList, { playerIsInList } from './NonFriendsListArea';
import { render, RenderResult, waitFor } from '@testing-library/react';

describe('playerIsInList', () => {
  let testPCList: PlayerController[];
  let playerController1: PlayerController;
  let playerController2: PlayerController;
  const player1: Player = {
    id: nanoid(),
    location: { moving: false, rotation: 'back', x: 10, y: 12, interactableID: nanoid() },
    userName: nanoid(),
  };
  const player2: Player = {
    id: nanoid(),
    location: { moving: false, rotation: 'back', x: 0, y: 1, interactableID: nanoid() },
    userName: nanoid(),
  };
  beforeEach(() => {
    playerController1 = PlayerController.fromPlayerModel(player1);
    playerController2 = PlayerController.fromPlayerModel(player2);
    testPCList = [playerController1];
  });
  it('Should return true if the given player is in the list', () => {
    expect(playerIsInList(playerController1, testPCList)).toBe(true);
  });
  it('Should return false if the given player is NOT in the list', () => {
    expect(playerIsInList(playerController2, testPCList)).toBe(false);
    expect(playerIsInList(playerController1, [])).toBe(false);
  });
});

describe('NonFriendsInTownList', () => {
  const randomLocation = (): PlayerLocation => ({
    moving: Math.random() < 0.5,
    rotation: 'front',
    x: Math.random() * 1000,
    y: Math.random() * 1000,
  });
  const wrappedPlayersListComponent = () => (
    <ChakraProvider>
      <React.StrictMode>
        <PlayersList />
      </React.StrictMode>
    </ChakraProvider>
  );
  const renderNonFriendsList = () => render(wrappedPlayersListComponent());
  let consoleErrorSpy: jest.SpyInstance<void, [message?: any, ...optionalParms: any[]]>;
  let usePlayersSpy: jest.SpyInstance<PlayerController[], []>;
  let useTownControllerSpy: jest.SpyInstance<TownController, []>;
  let useFriendsSpy: jest.SpyInstance<PlayerController[], []>;
  let useFriendRequestsSpy: jest.SpyInstance<PlayerToPlayerUpdate[], []>;
  let players: PlayerController[] = [];
  let friends: PlayerController[] = [];
  let friendRequests: PlayerToPlayerUpdate[] = [];
  let townID: string;
  let townFriendlyName: string;
  const expectProperlyRenderedNonFriendsList = async (
    renderData: RenderResult,
    playersToExpect: PlayerController[],
  ) => {
    const listEntries = await renderData.findAllByRole('listitem');
    // expect same # of players * 2 (one for each part of the non friend list element: name & button)
    expect(listEntries.length).toBe(playersToExpect.length); // expect same number of players
    const playersSortedCorrectly = playersToExpect
      .map(p => p.userName)
      .sort((p1, p2) => p1.localeCompare(p2, undefined, { numeric: true, sensitivity: 'base' }));
    for (let i = 0; i < playersSortedCorrectly.length; i += 1) {
      expect(listEntries[i]).toHaveTextContent(playersSortedCorrectly[i]);
      const parentComponent = listEntries[i].parentNode;
      if (parentComponent) {
        expect(parentComponent.nodeName).toBe('OL'); // list items expected to be directly nested in an ordered list
      }
    }
  };
  beforeAll(() => {
    // Spy on console.error and intercept react key warnings to fail test
    consoleErrorSpy = jest.spyOn(global.console, 'error');
    consoleErrorSpy.mockImplementation((message?, ...optionalParams) => {
      const stringMessage = message as string;
      if (stringMessage.includes('children with the same key,')) {
        throw new Error(stringMessage.replace('%s', optionalParams[0]));
      } else if (stringMessage.includes('warning-keys')) {
        throw new Error(stringMessage.replace('%s', optionalParams[0]));
      }
      // eslint-disable-next-line no-console -- we are wrapping the console with a spy to find react warnings
      console.warn(message, ...optionalParams);
    });
    usePlayersSpy = jest.spyOn(TownControllerHooks, 'usePlayers');
    useTownControllerSpy = jest.spyOn(useTownController, 'default');
    useFriendsSpy = jest.spyOn(TownControllerHooks, 'useCurrentPlayerFriends');
    useFriendRequestsSpy = jest.spyOn(TownControllerHooks, 'useCurrentPlayerFriendRequests');
  });

  beforeEach(() => {
    players = [];
    for (let i = 0; i < 10; i += 1) {
      players.push(
        new PlayerController(
          `testingPlayerID${i}-${nanoid()}`,
          `testingPlayerUser${i}-${nanoid()}}`,
          randomLocation(),
        ),
      );
    }
    friends = [];
    friendRequests = [];
    usePlayersSpy.mockReturnValue(players);
    useFriendsSpy.mockReturnValue(friends);
    useFriendRequestsSpy.mockReturnValue(friendRequests);
    townID = nanoid();
    townFriendlyName = nanoid();
    const mockedTownController = mockTownController({ friendlyName: townFriendlyName, townID });
    useTownControllerSpy.mockReturnValue(mockedTownController);
  });
  describe('Heading', () => {
    it('Displays a heading "Other Players in This Town', async () => {
      const renderData = renderNonFriendsList();
      const heading = await renderData.findByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent(`Other Players In This Town`);
    });
  });
  describe('Adding a friend', () => {
    let expectedNonFriends: PlayerController[];
    beforeEach(() => {
      // Set up the expected not-friends list
      expectedNonFriends = [...players];
      expectedNonFriends.splice(0, 1);

      // Add a new friend
      const newFriends = friends.concat([players[0]]);
      useFriendsSpy.mockReturnValue(newFriends);
    });
    it('Renders a list of all not-friend user names without checking sort', async () => {
      const renderData = renderNonFriendsList();
      // Player param should not have changed
      expect(players.length).toBe(10);
      // Number of rendered players should have changed to 9
      await expectProperlyRenderedNonFriendsList(renderData, expectedNonFriends);
    });
    it("Displays players' usernames in ascending alphabetical order, once friend added", async () => {
      expectedNonFriends.reverse();
      const renderData = renderNonFriendsList();
      await expectProperlyRenderedNonFriendsList(renderData, expectedNonFriends);
    });
    it('Does not mutate the array returned by useCurrentPlayerFriends', async () => {
      // Add two friends
      const newFriends2 = friends.concat([players[0], players[1]]);
      useFriendsSpy.mockReturnValue(newFriends2);
      expectedNonFriends.splice(0, 1);

      friends.reverse();
      const copyOfArrayPassedToComponent = friends.concat([]);

      const renderData = renderNonFriendsList();
      await expectProperlyRenderedNonFriendsList(renderData, expectedNonFriends);
      expect(friends).toEqual(copyOfArrayPassedToComponent); // expect that the players array is unchanged by the compoennt
    });
  });
  it('Renders a list of all not-friend user names, without checking sort', async () => {
    // Players array is already sorted correctly
    const renderData = renderNonFriendsList();
    await expectProperlyRenderedNonFriendsList(renderData, players);
  });
  it("Renders the players' names in a PlayerName component", async () => {
    const mockPlayerName = jest.spyOn(PlayerName, 'default');
    try {
      renderNonFriendsList();
      await waitFor(() => {
        // length * 2 due to useEffect dependencies leading to a double call
        expect(mockPlayerName).toBeCalledTimes(players.length * 2);
      });
    } finally {
      mockPlayerName.mockRestore();
    }
  });
  it("Displays players' usernames in ascending alphabetical order", async () => {
    players.reverse();
    const renderData = renderNonFriendsList();
    await expectProperlyRenderedNonFriendsList(renderData, players);
  });
  it('Does not mutate the array returned by usePlayersInTown', async () => {
    players.reverse();
    const copyOfArrayPassedToComponent = players.concat([]);
    const renderData = renderNonFriendsList();
    await expectProperlyRenderedNonFriendsList(renderData, players);
    expect(players).toEqual(copyOfArrayPassedToComponent); // expect that the players array is unchanged by the compoennt
  });
  it('Adds players to the list when they are added to the town', async () => {
    const renderData = renderNonFriendsList();
    await expectProperlyRenderedNonFriendsList(renderData, players);
    for (let i = 0; i < players.length; i += 1) {
      const newPlayers = players.concat([
        new PlayerController(
          `testingPlayerID-${i}.new`,
          `testingPlayerUser${i}.new`,
          randomLocation(),
        ),
      ]);
      usePlayersSpy.mockReturnValue(newPlayers);
      renderData.rerender(wrappedPlayersListComponent());
      await expectProperlyRenderedNonFriendsList(renderData, newPlayers);
    }
  });
  it('Removes players from the list when they are removed from the town', async () => {
    const renderData = renderNonFriendsList();
    await expectProperlyRenderedNonFriendsList(renderData, players);
    for (let i = 0; i < players.length; i += 1) {
      const newPlayers = players.splice(i, 1);
      usePlayersSpy.mockReturnValue(newPlayers);
      renderData.rerender(wrappedPlayersListComponent());
      await expectProperlyRenderedNonFriendsList(renderData, newPlayers);
    }
  });
});
