import { Center, Table, TableContainer, Tbody, Th, Thead, Tr } from '@chakra-ui/react';
import ConversationAreaInviteItem from './ConversationAreaInviteItem';
import React from 'react'; // gets rid of eslint error
import { usePendingConversationAreaInvites } from '../../classes/TownController';

/**
 * Renders a Chakra Table that shows this Player their pending Conversation
 * Area invites by requester, Conversation Area Name, and with associated accept or decline
 * request Buttons.
 * @returns {JSX.Element} a Table representing this Player's pending Conversation
 *                        Area invites.
 */
export default function ConversationAreaInviteList(): JSX.Element {
  const conversationAreaInvites = usePendingConversationAreaInvites();
  const requestCount = conversationAreaInvites.length;

  return (
    <>
      {requestCount === 0 ? (
        <Center>You Have No Current Requests</Center>
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
    </>
  );
}
