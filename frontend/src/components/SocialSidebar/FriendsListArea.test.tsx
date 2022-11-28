import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';
import { render, RenderResult } from '@testing-library/react';
import { nanoid } from 'nanoid';
import React from 'react';
import PlayerController from '../../classes/PlayerController';
import TownController, * as TownControllerHooks from '../../classes/TownController';
import * as useTownController from '../../hooks/useTownController';
import { mockTownController } from '../../TestUtils';
import { PlayerLocation, PlayerToPlayerUpdate } from '../../types/CoveyTownSocket';
import FriendsInTownList from './FriendsListArea';

describe('FriendsInTownList', () => {
  const randomLocation = (): PlayerLocation => ({
    moving: Math.random() < 0.5,
    rotation: 'front',
    x: Math.random() * 1000,
    y: Math.random() * 1000,
  });
  const wrappedFriendsListAreaComponent = () => (
    <ChakraProvider>
      <React.StrictMode>
        <FriendsInTownList />
      </React.StrictMode>
    </ChakraProvider>
  );
  const renderFriendsListArea = () => render(wrappedFriendsListAreaComponent());
  let consoleErrorSpy: jest.SpyInstance<void, [message?: any, ...optionalParms: any[]]>;
  let usePlayersSpy: jest.SpyInstance<PlayerController[], []>;
  let useTownControllerSpy: jest.SpyInstance<TownController, []>;
  let useFriendsSpy: jest.SpyInstance<PlayerController[], []>;
  let useSelectedFriendsSpy: jest.SpyInstance<PlayerController[], []>;
  let useFriendRequestsSpy: jest.SpyInstance<PlayerToPlayerUpdate[], []>;
  let players: PlayerController[] = [];
  let friends: PlayerController[] = [];
  let selectedFriends: PlayerController[] = [];
  let friendRequests: PlayerToPlayerUpdate[] = [];
  let townID: string;
  let townFriendlyName: string;
  const expectProperlyRenderedFriendsList = async (
    renderData: RenderResult,
    playersToExpect: PlayerController[],
  ) => {
    const listEntries = await renderData.findAllByRole('listitem');
    // expect same # of players * 2 (one for each part of the player list element: name & button)
    expect(listEntries.length).toBe(playersToExpect.length); // expect same number of players
    const playersSortedCorrectly = playersToExpect
      .map(p => p.userName + 'TeleportUnfriend')
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
    useSelectedFriendsSpy = jest.spyOn(TownControllerHooks, 'useSelectedFriends');
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
    selectedFriends = [];
    usePlayersSpy.mockReturnValue(players);
    useFriendsSpy.mockReturnValue(friends);
    useFriendRequestsSpy.mockReturnValue(friendRequests);
    useSelectedFriendsSpy.mockReturnValue(selectedFriends);
    townID = nanoid();
    townFriendlyName = nanoid();
    const mockedTownController = mockTownController({ friendlyName: townFriendlyName, townID });
    useTownControllerSpy.mockReturnValue(mockedTownController);
  });
  describe('Heading', () => {
    it('Displays a heading "Friends', async () => {
      const renderData = renderFriendsListArea();
      const heading = await renderData.findByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent(`Friends:`);
    });
  });
  describe('Friends Section', () => {
    let expectedFriends: PlayerController[];
    beforeEach(() => {
      // Set up the expected friends list
      expectedFriends = [players[0], players[1], players[2]];

      // Add 3 new friends
      friends = friends.concat([players[0], players[1], players[2]]);
      useFriendsSpy.mockReturnValue(friends);
    });
    it('Renders a list of all friend user names without checking sort', async () => {
      const renderData = renderFriendsListArea();
      // friends param should not have changed
      expect(friends.length).toBe(3);

      // Number of rendered players should be 3
      await expectProperlyRenderedFriendsList(renderData, expectedFriends);
    });
    it("Displays friends' usernames in ascending alphabetical order, once friend added", async () => {
      expectedFriends.reverse();
      const renderData = renderFriendsListArea();
      await expectProperlyRenderedFriendsList(renderData, expectedFriends);
    });
    it('Does not mutate the array returned by useCurrentPlayerFriends', async () => {
      // Add two friends (should be 5 total)
      friends = friends.concat([players[3], players[4]]);
      useFriendsSpy.mockReturnValue(friends);

      // add two friends to expected (should be 5 total)
      expectedFriends = expectedFriends.concat([players[3], players[4]]);

      // flip friends
      friends.reverse();
      // make a copy of flipped friends
      const copyOfArrayPassedToComponent = friends.concat([]);

      const renderData = renderFriendsListArea();
      await expectProperlyRenderedFriendsList(renderData, expectedFriends);
      expect(friends).toEqual(copyOfArrayPassedToComponent); // expect that the players array is unchanged by the compoennt
    });
    describe('Remove friend', () => {
      it('Renders a list of friends when one friend is removed', async () => {
        friends.pop();
        useFriendsSpy.mockReturnValue([players[0], players[1]]);
        expectedFriends = [players[0], players[1]];

        const renderData = renderFriendsListArea();
        // friends param should not have changed
        expect(friends.length).toBe(2);

        // Number of rendered players should be 3
        await expectProperlyRenderedFriendsList(renderData, expectedFriends);
      });
    });
  });
});
