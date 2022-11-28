import { Box, Heading, Tooltip } from '@chakra-ui/react';
import React from 'react';
import useTownController from '../../hooks/useTownController';
import FriendsList from './FriendsList';
import MiniMessageBox from './MiniMessageBox';

/**
 * Lists the current friends of this TownController.ourPlayer, along with the buttons to invite
 * selected friends to a conversation area, view conversation area invites, and send a mini
 * message to all selected friends.
 *
 * See relevant hooks: 'useTownController'
 *
 * Called in the SocialSidebar component. Uses the FriendsList component
 */
export default function FriendsInTownList(): JSX.Element {
  const townController = useTownController();

  return (
    <Box>
      <Tooltip label={`Town ID: ${townController.townID}`}>
        <Heading as='h2' fontSize='l'>
          Friends:
        </Heading>
      </Tooltip>
      {FriendsList()}
      {/* {console.log(
        'This is where the create conversation area button would go. Add a button somewhere to open the drawer holding the invites.',
      )} */}
      {MiniMessageBox()}
    </Box>
  );
}
