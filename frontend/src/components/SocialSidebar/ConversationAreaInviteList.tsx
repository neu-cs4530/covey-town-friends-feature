import { Center, Table, TableContainer, Tbody, Th, Thead, Tr } from '@chakra-ui/react';
import ConversationAreaInviteItem from './ConversationAreaInviteItem';
import React from 'react'; // gets rid of eslint error
import { usePendingConversationAreaInvites } from '../../classes/TownController';

/**
 * Renders a Chakra Table that shows this Player their pending Conversation
 * Area invites by requester, Conversation Area Name, and with associated accept or decline
 * request Buttons.
 * @returns {JSX.Element} a Table representing this Player's pending Conversation
 *                        Area invites, or text letting the Player know that they
 *                        do not have any current requests.
 */
export default function ConversationAreaInviteList(): JSX.Element {
  const conversationAreaInvites = usePendingConversationAreaInvites();
  const requestCount = conversationAreaInvites.length;

  return (
    <>
      {requestCount === 0 ? (
        <Center aria-label={'noCurrentRequestsText'}>You Have No Current Requests</Center>
      ) : (
        <TableContainer aria-label={'convAreaRequestsTable'}>
          <Table variant={'simple'}>
            <Thead aria-label={'convAreaRequestsTableHeader'}>
              <Tr>
                <Th>Requester</Th>
                <Th>Destination Location</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody aria-label={'convAreaRequestsTableBody'}>
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
    </>
  );
}
