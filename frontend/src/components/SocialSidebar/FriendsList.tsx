import { Box, Heading, OrderedList, Tooltip } from '@chakra-ui/react';
import React from 'react';
import useTownController from '../../hooks/useTownController';

/**
 * Lists the current friends of this TownController.ouPlayer, along with the buttons to invite
 * selected friends to a conversation area, view conversation area invites, and send a brief
 * message to all selected friends.
 *
 * See relevant hooks: `usePlayersInTown` and `useCoveyAppState`
 *
 */
export default function FriendsInTownList(): JSX.Element {
  const { friendlyName, townID } = useTownController();

  // IMPORTANT NOTE: Remember that you can define buttons elsewhere, and then just import them
  // and add them where necessary here. ==> TODO: remove this comment in Sprint 3.

  return (
    <Box>
      <Tooltip label={`Town ID: ${townID}`}>
        <Heading as='h2' fontSize='l'>
          Current town: {friendlyName}
        </Heading>
      </Tooltip>
      <OrderedList>
        {console.log(
          'This is where the friends list & associated buttons would go. See PlayersList for inspiration',
        )}
      </OrderedList>
      {console.log(
        'This is where the create conversation area button would go. Add a button somewhere to open the drawer holding the invites.',
      )}
      {console.log('This is where the text entry box + associated button would go.')}
    </Box>
  );
}
