import {
  Button,
  Center,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Table,
  TableContainer,
  Tbody,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import ConversationAreaInviteItem from './ConversationAreaInviteItem';
import React from 'react'; // gets rid of eslint error
import useTownController from '../../hooks/useTownController';
import { usePendingConversationAreaInvites } from '../../classes/TownController';

/**
 * Renders a Chakra Drawer with a Table that shows this Player their pending Conversation
 * Area invites by requester, Conversation Area Name, and with associated accept or decline
 * request Buttons.
 * @returns {JSX.Element} a Drawer with a Table representing this Player's pending Conversation
 *                        Area invites.
 */
export default function ConversationAreaInviteList(): JSX.Element {
  const townController = useTownController();
  const conversationAreaInvites = usePendingConversationAreaInvites();
  const requestCount = conversationAreaInvites.length;

  return (
    <>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          <Center>Your Conversation Area Invites</Center>
          <Center style={{ paddingTop: '10px' }}>
            {requestCount === 0 ? (
              <></>
            ) : (
              <Button
                colorScheme={'red'}
                variant={'solid'}
                size={'xs'}
                onClick={() =>
                  townController.conversationAreaInvites.forEach(invite =>
                    townController.clickedDeclineConvAreaInvite(invite),
                  )
                }>
                Decline All Invitations
              </Button>
            )}
          </Center>
        </DrawerHeader>
        <DrawerBody>
          {requestCount === 0 ? (
            'You Have No Current Requests'
          ) : (
            <TableContainer>
              <Table variant={'simple'}>
                <Thead>
                  <Tr>
                    <Th>Requester</Th>
                    <Th>Destination Location</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {conversationAreaInvites.map(request => (
                    <>
                      <ConversationAreaInviteItem
                        requester={request.requester}
                        requested={request.requested}
                        requesterLocation={request.requesterLocation}
                        key={request.toString()}
                      />
                    </>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </DrawerBody>
      </DrawerContent>
    </>
  );
}
