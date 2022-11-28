import { Box, Heading, Tooltip } from '@chakra-ui/react';
import React from 'react';
import useTownController from '../../hooks/useTownController';
import FriendsList from './FriendsList';
import InviteToConversationAreaButton from './InviteToConversationAreaButton';
import MiniMessageBox from './MiniMessageBox';

/**
 * Lists the current friends of this TownController.ourPlayer, along with the buttons to invite
 * selected friends to a conversation area, view conversation area invites, and send MiniMessages
 * to all selected friends.
 *
 * See relevant hooks: 'useTownController'
 *
 * Called in the SocialSidebar component. Uses the FriendsList, InviteToConversationAreaButton,
 * and MiniMessageBox components.
 */
export default function FriendsInTownList(): JSX.Element {
  const { townID } = useTownController();

  return (
    <Box>
      <Tooltip label={`Town ID: ${townID}`}>
        <Heading as='h2' fontSize='l'>
          Friends:
        </Heading>
      </Tooltip>
      <FriendsList />
      <InviteToConversationAreaButton />
      <MiniMessageBox />
    </Box>
  );
}
