import { ChakraProvider } from '@chakra-ui/react';
import { RenderResult, fireEvent, render } from '@testing-library/react';
import { mock, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import React from 'react';
import ConversationAreaController from '../../classes/ConversationAreaController';
import PlayerController from '../../classes/PlayerController';
import TownController from '../../classes/TownController';
import { LoginController } from '../../contexts/LoginControllerContext';
import TownControllerContext from '../../contexts/TownControllerContext';
import { mockTownControllerConnection } from '../../TestUtils';
import { BoundingBox, CoveyTownSocket } from '../../types/CoveyTownSocket';
import InviteToConversationAreaButton from './InviteToConversationAreaButton';

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

function createConversationForTesting(params?: {
  label?: string;
  boundingBox?: BoundingBox;
  occupants?: PlayerController[];
  emptyTopic?: boolean;
}): ConversationAreaController {
  const area = new ConversationAreaController(
    params?.label || nanoid(),
    params?.emptyTopic ? undefined : nanoid(),
  );
  if (params?.occupants) {
    area.occupants = params?.occupants;
  }
  return area;
}
process.env.REACT_APP_TOWNS_SERVICE_URL = 'testing';

describe('ConversationAreaInviteList', () => {
  /**
   * Check that the conversation areas invite list rendered follows the specifications
   * for formatting and that the tag text matches the number of conversation area invites.
   */
  const expectProperlyRenderedInviteButton = async (
    renderData: RenderResult,
    activeAreas: ConversationAreaController[],
    selectedFriends?: PlayerController[],
  ) => {
    // check to see if there are any active areas that a player could invite their friends to
    const cannotSendRequests =
      activeAreas.length === 0 || !selectedFriends || selectedFriends.length === 0;
    // regardless of the selectedFriends, the following elements should be rendered
    const inviteSelectedButton = await renderData.findByLabelText('inviteSelectedToConvAreaButton');
    expect(inviteSelectedButton).toBeDefined();
    // click the Button element to fire the toasts
    fireEvent.click(inviteSelectedButton);
    // get the alerts
    const alerts = renderData.getAllByRole('alert');

    if (cannotSendRequests) {
      // the toast message should display to the user that the action failed
      const failedToastMessage = alerts.filter(alert => alert.textContent?.includes('Send'));
      const successToastMessage = alerts.filter(alert => alert.textContent?.includes('Sent'));
      expect(failedToastMessage.length).toBeDefined();
      expect(successToastMessage.length).toEqual(0);
    } else {
      // toast message should display to the user that the action has succeeded
      const failedToastMessage = alerts.filter(alert => alert.textContent?.includes('Send'));
      const successToastMessage = alerts.filter(alert => alert.textContent?.includes('Sent'));
      expect(failedToastMessage.length).toEqual(0);
      expect(successToastMessage.length).toBeDefined();
      // toast message should display the selected friends usernames
      selectedFriends.forEach(friend => {
        expect(successToastMessage[0].innerText).toContain(friend.userName);
      });
    }
  };

  let consoleErrorSpy: jest.SpyInstance<void, [message?: any, ...optionalParms: any[]]>;
  let testController: TownController;

  beforeAll(() => {
    // Spy on console.error and intercept react key warnings to fail test
    consoleErrorSpy = jest.spyOn(global.console, 'error');
  });
  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  const allPlayers: PlayerController[] = [];
  let activeArea0: ConversationAreaController;
  let activeArea1: ConversationAreaController;
  const allActiveAreas: ConversationAreaController[] = [];
  let renderConversationAreaList: (
    expectedAreas?: ConversationAreaController[],
  ) => Promise<RenderResult>;

  beforeEach(async () => {
    // clear the past calls to avoid test order dependency
    mockClear(mockSocket);

    // set up the test data
    for (let i = 0; i < 5; i++) {
      allPlayers.push(
        new PlayerController(`playerID.${i}`, `userName.${i}`, {
          x: 0,
          y: 0,
          interactableID: nanoid(), // should not be checked by conversation area list
          rotation: 'front',
          moving: false,
        }),
      );
    }
    activeArea0 = createConversationForTesting({
      label: 'activeArea0',
      occupants: [allPlayers[0]],
    });
    activeArea1 = createConversationForTesting({
      label: 'activeArea1',
      occupants: [allPlayers[1]],
    });
    allActiveAreas.concat(activeArea0, activeArea1);

    // set up a mock return of ourPlayer as the testController does not have ourPlayer
    jest.spyOn(TownController.prototype, 'ourPlayer', 'get').mockReturnValue(allPlayers[0]);

    /**
     * Renders a conversation area list component, providing the testController
     * as the TownController to integration test behaviors including those of
     * the TownController and the React hooks + components.
     */
    renderConversationAreaList = async (areasToRender?: ConversationAreaController[]) => {
      testController = new TownController({
        userName: nanoid(),
        townID: nanoid(),
        loginController: mock<LoginController>(),
      });
      if (areasToRender === undefined) {
        areasToRender = allActiveAreas;
      }
      await mockTownControllerConnection(testController, mockSocket, {
        interactables: areasToRender.map(eachArea => eachArea.toConversationAreaModel()),
        currentPlayers: allPlayers.map(eachPlayer => eachPlayer.toPlayerModel()),
        friendlyName: nanoid(),
        isPubliclyListed: true,
        providerVideoToken: nanoid(),
        sessionToken: nanoid(),
        userID: nanoid(),
      });

      return render(
        <ChakraProvider>
          <React.StrictMode>
            <TownControllerContext.Provider value={testController}>
              <InviteToConversationAreaButton />
            </TownControllerContext.Provider>
          </React.StrictMode>
        </ChakraProvider>,
      );
    };
  });
  describe('When there are no active conversation areas', () => {
    it('Displays the button properly', async () => {
      const inactiveAreas = [
        createConversationForTesting({ emptyTopic: true }),
        createConversationForTesting({ emptyTopic: true }),
      ];
      const renderData = await renderConversationAreaList(inactiveAreas);
      await expectProperlyRenderedInviteButton(renderData, inactiveAreas);
    });
    it('Displays the error toast message when button is clicked', async () => {
      const renderData = await renderConversationAreaList();
      await expectProperlyRenderedInviteButton(renderData, []);
    });
  });
  describe('When there are active conversation areas but no selected friends', () => {
    it('Displays the button properly', async () => {
      const inactiveAreas = [
        createConversationForTesting({ emptyTopic: true }),
        createConversationForTesting({ emptyTopic: true }),
      ];
      const renderData = await renderConversationAreaList(inactiveAreas);
      await expectProperlyRenderedInviteButton(renderData, inactiveAreas);
    });
    it('Displays the error toast message when button is clicked', async () => {
      const renderData = await renderConversationAreaList();
      await expectProperlyRenderedInviteButton(renderData, []);
    });
  });
  describe('When there are active areas and selected friends', () => {
    it('Displays the button properly', async () => {
      const renderData = await renderConversationAreaList();
      await expectProperlyRenderedInviteButton(renderData, []);
    });
    it('displays the success toast message when the button is pressed', async () => {
      const renderData = await renderConversationAreaList();
      await expectProperlyRenderedInviteButton(renderData, allActiveAreas, allPlayers);
    });
    it('displays selected players usernames in the toast message when the button is pressed', async () => {
      const renderData = await renderConversationAreaList();
      await expectProperlyRenderedInviteButton(renderData, allActiveAreas, allPlayers);
    });
  });
});
