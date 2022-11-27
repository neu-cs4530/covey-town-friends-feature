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
import { BoundingBox, CoveyTownSocket, TeleportInviteSingular } from '../../types/CoveyTownSocket';
import ConversationAreaInviteListContainer from './ConversationAreaInviteListContainer';

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
  const expectProperlyRenderedInviteItems = async (
    renderData: RenderResult,
    activeAreas: ConversationAreaController[],
    areaInvites?: TeleportInviteSingular[],
  ) => {
    // check to see if there are any active invitations
    const noActiveInvitesExist =
      activeAreas.length === 0 || !areaInvites || areaInvites.length === 0;
    // regardless of the active invitations, the following elements should be rendered
    // in the drawer
    const viewInvitesButton = await renderData.findByLabelText('viewYourInvitesButton');
    expect(viewInvitesButton).toBeDefined();
    // click the Button element to open the drawer
    fireEvent.click(viewInvitesButton);

    // search for the text that indicates the current number of invites to this Player
    const requestCountText = renderData.queryByLabelText('noCurrentRequestsText');
    // search for the Table elements
    const requestsTable = renderData.queryByLabelText('convAreaRequestsTable');
    const requestsHeader = renderData.queryByLabelText('convAreaRequestsTableHeader');
    const requestsBody = renderData.queryByLabelText('convAreaRequestsTableBody');
    const tableRows = renderData.queryAllByLabelText('convAreaRequestsTableRow');
    const acceptButtons = renderData.queryAllByLabelText('acceptConvAreaRequestButtton');
    const declineButtons = renderData.queryAllByLabelText('declineConvAreaRequestButtton');

    if (noActiveInvitesExist) {
      //the 'You Have No Current Requests' text should be displayed
      expect(requestCountText).toBeDefined();
      // the Table elements should NOT be defined
      expect(requestsTable).toBeNull();
      expect(requestsHeader).toBeNull();
      expect(requestsBody).toBeNull();
      expect(tableRows.length).toBe(0);
      expect(acceptButtons.length).toBe(0);
      expect(declineButtons.length).toBe(0);
    } else {
      // if there are both active conversation areas and a non-zero amount of area invitations,
      // the 'You Have No Current Requests' text should NOT be displayed
      expect(requestCountText).toBeNull();
      // the Table elements should be defined
      expect(requestsTable).toBeDefined();
      expect(requestsHeader).toBeDefined();
      expect(requestsBody).toBeDefined();
      // the number of table rows, accept Buttons, and decline Buttons should match the
      // length of the conversation area invites
      expect(tableRows.length).toEqual(areaInvites.length);
      expect(acceptButtons.length).toEqual(areaInvites.length);
      expect(declineButtons.length).toEqual(areaInvites.length);
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
  let invite0: TeleportInviteSingular;
  let invite1: TeleportInviteSingular;
  const allInvitations: TeleportInviteSingular[] = [];
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
    invite0 = {
      requester: allPlayers[0].id,
      requested: allPlayers[2].id,
      requesterLocation: allPlayers[0].location,
    };
    invite1 = {
      requester: allPlayers[1].id,
      requested: allPlayers[2].id,
      requesterLocation: allPlayers[1].location,
    };
    allInvitations.concat(invite0, invite1);

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
              <ConversationAreaInviteListContainer />
            </TownControllerContext.Provider>
          </React.StrictMode>
        </ChakraProvider>,
      );
    };
  });
  describe('When there are no active conversation areas', () => {
    it('Does not display a table when there are no active areas', async () => {
      const inactiveAreas = [
        createConversationForTesting({ emptyTopic: true }),
        createConversationForTesting({ emptyTopic: true }),
      ];
      const renderData = await renderConversationAreaList(inactiveAreas);
      await expectProperlyRenderedInviteItems(renderData, []);
    });
  });
  describe('When there are active conversation areas but no active invitations', () => {
    it('Does not display a table when area invites is undefined', async () => {
      const renderData = await renderConversationAreaList();
      await expectProperlyRenderedInviteItems(renderData, allActiveAreas);
    });
  });
  describe('When there are active areas and active invitations', () => {
    it('displays 2 table rows and four buttons when there are two area invites', async () => {
      const renderData = await renderConversationAreaList();
      await expectProperlyRenderedInviteItems(renderData, allActiveAreas, allInvitations);
    });
    it('updates the number of table rows and buttons when the area invites change', async () => {
      const renderData = await renderConversationAreaList();
      await expectProperlyRenderedInviteItems(renderData, allActiveAreas, allInvitations);
      const updatedAreas = testController.conversationAreas.slice(1);
      const updatedInvites = testController.conversationAreaInvites.slice(1);
      await expectProperlyRenderedInviteItems(renderData, updatedAreas, updatedInvites);
    });
    it('updates the rendered elements when there are no longer invitations', async () => {
      const renderData = await renderConversationAreaList();
      await expectProperlyRenderedInviteItems(renderData, allActiveAreas, allInvitations);
      const updatedInvitations: TeleportInviteSingular[] = [];
      await expectProperlyRenderedInviteItems(renderData, allActiveAreas, updatedInvitations);
    });
    it('updates the rendered elements when there are no longer active areas', async () => {
      const renderData = await renderConversationAreaList();
      await expectProperlyRenderedInviteItems(renderData, allActiveAreas, allInvitations);
      const updatedAreas: ConversationAreaController[] = [];
      await expectProperlyRenderedInviteItems(renderData, updatedAreas, allInvitations);
    });
  });
});
