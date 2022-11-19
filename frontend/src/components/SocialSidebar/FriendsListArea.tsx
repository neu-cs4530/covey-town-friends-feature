import { Box, Heading, Tooltip } from '@chakra-ui/react';
import React from 'react';
import useTownController from '../../hooks/useTownController';
import FriendsList from './FriendsList';

/**
 * Lists the current friends of this TownController.ourPlayer, along with the buttons to invite
 * selected friends to a conversation area, view conversation area invites, and send a brief
 * message to all selected friends.
 *
 * See relevant hooks: 'useTownController', + ADD IN OTHERS YOU USE
 *
 * Called in the SocialSidebar component. Uses the FriendsList component
 */
export default function FriendsInTownList(): JSX.Element {
  const { friendlyName, townID } = useTownController();

  // IMPORTANT NOTE: Remember that you can define buttons elsewhere, and then just import them
  // and add them where necessary here.
  // TODO: remove the above comment in Sprint 3.

  return (
    <Box>
      <Tooltip label={`Town ID: ${townID}`}>
        <Heading as='h2' fontSize='l'>
          Friends:
        </Heading>
      </Tooltip>
      {FriendsList()}
      {/* {console.log(
        'This is where the create conversation area button would go. Add a button somewhere to open the drawer holding the invites.',
      )} */}
      {/* {console.log('This is where the text entry box + associated button would go.')} */}
    </Box>
  );
}
