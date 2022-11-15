import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';
import { render, RenderResult, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { nanoid } from 'nanoid';
import React from 'react';
import TownController, * as TownControllerHooks from '../../classes/TownController';
import PlayerController from '../../classes/PlayerController';
import * as useTownController from '../../hooks/useTownController';
import { mockTownController } from '../../TestUtils';
import { Player, PlayerLocation } from '../../types/CoveyTownSocket';
import * as PlayerName from './PlayerName';
import PlayersList, { isPlayerInList } from './PlayersList';
import { type } from 'os';

describe('isPlayerInList', () => {
  let testList: PlayerController[];
  let contPlayer1: PlayerController;
  let contPlayer2: PlayerController;
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
    contPlayer1 = PlayerController.fromPlayerModel(player1);
    contPlayer2 = PlayerController.fromPlayerModel(player2);
    testList = [contPlayer1];
  });
  it('Should return true if the given player is in the list', () => {
    expect(isPlayerInList(contPlayer1, testList)).toBe(true);
  });
  it('Should return false if the given player is NOT in the list', () => {
    expect(isPlayerInList(contPlayer2, testList)).toBe(false);
    expect(isPlayerInList(contPlayer1, [])).toBe(false);
  });
});

describe('PlayersInTownList', () => {
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
  const renderPlayersList = () => render(wrappedPlayersListComponent());
  let consoleErrorSpy: jest.SpyInstance<void, [message?: any, ...optionalParms: any[]]>;
  let usePlayersSpy: jest.SpyInstance<PlayerController[], []>;
  let useTownControllerSpy: jest.SpyInstance<TownController, []>;
  let players: PlayerController[] = [];
  let townID: string;
  let townFriendlyName: string;
  const expectProperlyRenderedPlayersList = async (
    renderData: RenderResult,
    playersToExpect: PlayerController[],
  ) => {
    const listEntries = await renderData.findAllByRole('listitem');
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
      //const stringMessage = message as string;
      const stringMessage = `${message}`;
      console.log('MESSAGE');
      console.log(typeof stringMessage);
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
    usePlayersSpy.mockReturnValue(players);
    townID = nanoid();
    townFriendlyName = nanoid();
    const mockedTownController = mockTownController({ friendlyName: townFriendlyName, townID });
    useTownControllerSpy.mockReturnValue(mockedTownController);
  });
  describe('Heading', () => {
    it('Displays a heading "Other Players in This Town', async () => {
      const renderData = renderPlayersList();
      const heading = await renderData.findByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent(`Other Players In This Town`);
    });
    it('Includes a tooltip that has the town ID', async () => {
      const renderData = renderPlayersList();
      const heading = await renderData.findByRole('heading', { level: 2 });
      expect(renderData.queryByRole('tooltip')).toBeNull(); // no tooltip visible yet
      userEvent.hover(heading);
      const toolTip = await renderData.findByRole('tooltip'); // should be just one...
      expect(toolTip).toHaveTextContent(`Town ID: ${townID}`);
    });
  });
  it("Renders a list of all players' user names, without checking sort", async () => {
    // players array is already sorted correctly
    const renderData = renderPlayersList();
    await expectProperlyRenderedPlayersList(renderData, players);
  });
  it("Renders the players' names in a PlayerName component", async () => {
    const mockPlayerName = jest.spyOn(PlayerName, 'default');
    try {
      renderPlayersList();
      await waitFor(() => {
        expect(mockPlayerName).toBeCalledTimes(players.length);
      });
    } finally {
      mockPlayerName.mockRestore();
    }
  });
  it("Displays players' usernames in ascending alphabetical order", async () => {
    players.reverse();
    const renderData = renderPlayersList();
    await expectProperlyRenderedPlayersList(renderData, players);
  });
  it('Does not mutate the array returned by usePlayersInTown', async () => {
    players.reverse();
    const copyOfArrayPassedToComponent = players.concat([]);
    const renderData = renderPlayersList();
    await expectProperlyRenderedPlayersList(renderData, players);
    expect(players).toEqual(copyOfArrayPassedToComponent); // expect that the players array is unchanged by the compoennt
  });
  it('Adds players to the list when they are added to the town', async () => {
    const renderData = renderPlayersList();
    await expectProperlyRenderedPlayersList(renderData, players);
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
      await expectProperlyRenderedPlayersList(renderData, newPlayers);
    }
  });
  it('Removes players from the list when they are removed from the town', async () => {
    const renderData = renderPlayersList();
    await expectProperlyRenderedPlayersList(renderData, players);
    for (let i = 0; i < players.length; i += 1) {
      const newPlayers = players.splice(i, 1);
      usePlayersSpy.mockReturnValue(newPlayers);
      renderData.rerender(wrappedPlayersListComponent());
      await expectProperlyRenderedPlayersList(renderData, newPlayers);
    }
  });
});
