import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, RenderResult } from '@testing-library/react';
import { BoundingBox } from 'framer-motion';
import { mock, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import React from 'react';
import ConversationAreaController from '../../classes/ConversationAreaController';
import PlayerController from '../../classes/PlayerController';
import TownController from '../../classes/TownController';
import { LoginController } from '../../contexts/LoginControllerContext';
import TownControllerContext from '../../contexts/TownControllerContext';
import { mockTownControllerConnection } from '../../TestUtils';
import { CoveyTownSocket, TeleportInviteSingular } from '../../types/CoveyTownSocket';
import ConversationAreasList from './ConversationAreasList';

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

describe('ConversationAreaInviteListContainer', () => {
  /**
   * Check that the conversation areas invite list button rendered follows the specifications
   * for formatting and that the tag text matches the number of conversation area invites.
   */
  const expectProperlyRenderedAreaInvites = async (
    renderData: RenderResult,
    activeAreas: ConversationAreaController[],
    areaInvites?: TeleportInviteSingular[],
  ) => {
    // check to see if there are any active invitations
    const noActiveInvitesExist =
      activeAreas.length === 0 || !areaInvites || areaInvites.length === 0;
    // regardless of the active invitations,the following elements should be rendered
    // before clicking the 'View Your Invites' Button element
    const socialSideBarInvitesHeader = await renderData.findByLabelText('yourConvAreaInvites');
    const viewInvitesButton = await renderData.findByLabelText('viewYourInvitesButton');
    expect(socialSideBarInvitesHeader).toBeDefined();
    expect(viewInvitesButton).toBeDefined();
    // search for the tag that indicates the current number of invites to this Player
    const requestCountTag = renderData.queryByLabelText('requestCountTag');
    // if there are no active conversation areas in the town or there are no area invites to this
    // Player, there shouldn't be a Tag under the 'Your Conversation Areas Invitations' header
    if (noActiveInvitesExist) {
      // before the click there should be no Tag element in the Button under the
      // Your Conversation Areas Invitations header
      expect(requestCountTag).toBeNull();
    } else {
      // if there are both active conversation areas and a non-zero amount of area invitations,
      // both the button and the chakra number tag should be rendered before the click.
      expect(requestCountTag).toBeDefined();
      // the tag text should match the length of the conversation area invites
      expect(requestCountTag?.innerText).toEqual(areaInvites.length);
    }
    // click the Button element to open the drawer
    fireEvent.click(viewInvitesButton);
    // search for the decline all invitations button
    const declineAllButton = renderData.queryByLabelText('declineAllConvAreaRequestsButton');
    if (noActiveInvitesExist) {
      // after the click there should not be a decline all Button if there are no invitations
      expect(declineAllButton).toBeNull();
    } else {
      // after the click there should be Drawer & decline all Button if there are active invites
      expect(declineAllButton).toBeDefined();
    }
    // regardless of the invitations, the following elements should be rendered after clicking
    // the 'View Your Invites' Button element (there should be a Drawer with a Header and Body)
    const areaRequestsDrawer = await renderData.findByLabelText('convAreaRequestsDrawer');
    const areaRequestsHeader = await renderData.findByLabelText('convAreaRequestsDrawerHeader');
    const areaRequestsBody = await renderData.findByLabelText('convAreaRequestsDrawerBody');
    expect(areaRequestsDrawer).toBeDefined();
    expect(areaRequestsHeader).toBeDefined();
    expect(areaRequestsBody).toBeDefined();
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
              <ConversationAreasList />
            </TownControllerContext.Provider>
          </React.StrictMode>
        </ChakraProvider>,
      );
    };
  });
  describe('When there are no active conversation areas', () => {
    it('Does not display a number tag when there are no active areas', async () => {
      const inactiveAreas = [
        createConversationForTesting({ emptyTopic: true }),
        createConversationForTesting({ emptyTopic: true }),
      ];
      const renderData = await renderConversationAreaList(inactiveAreas);
      await expectProperlyRenderedAreaInvites(renderData, []);
    });
  });
  describe('When there are active conversation areas but no active invitations', () => {
    it('Does not display a number tag when area invites is undefined', async () => {
      const renderData = await renderConversationAreaList();
      await expectProperlyRenderedAreaInvites(renderData, allActiveAreas);
    });
    it('Does not display a number tag when there are zero area invites', async () => {
      const renderData = await renderConversationAreaList();
      await expectProperlyRenderedAreaInvites(renderData, allActiveAreas, []);
    });
  });
  describe('When there are active areas and active invitations', () => {
    it('displays 2 on the number tag when there are two area invites', async () => {
      const renderData = await renderConversationAreaList();
      await expectProperlyRenderedAreaInvites(renderData, allActiveAreas, allInvitations);
    });
    it('updates the tag number when the area invites change', async () => {
      const renderData = await renderConversationAreaList();
      await expectProperlyRenderedAreaInvites(renderData, allActiveAreas, allInvitations);
      const updatedAreas = testController.conversationAreas.slice(1);
      const updatedInvites = testController.conversationAreaInvites.slice(1);
      await expectProperlyRenderedAreaInvites(renderData, updatedAreas, updatedInvites);
    });
    it('updates the rendered elements when there are no longer invitations', async () => {
      const renderData = await renderConversationAreaList();
      await expectProperlyRenderedAreaInvites(renderData, allActiveAreas, allInvitations);
      const updatedInvitations: TeleportInviteSingular[] = [];
      await expectProperlyRenderedAreaInvites(renderData, allActiveAreas, updatedInvitations);
    });
    it('updates the rendered elements when there are no longer active areas', async () => {
      const renderData = await renderConversationAreaList();
      await expectProperlyRenderedAreaInvites(renderData, allActiveAreas, allInvitations);
      const updatedAreas: ConversationAreaController[] = [];
      await expectProperlyRenderedAreaInvites(renderData, updatedAreas, allInvitations);
    });
  });
});
