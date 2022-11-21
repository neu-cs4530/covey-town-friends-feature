import { Box, Heading, OrderedList, Tooltip } from '@chakra-ui/react';
import React from 'react';
import useTownController from '../../hooks/useTownController';

/**
 * Lists the current friends of this TownController.ourPlayer, along with the buttons to invite
 * selected friends to a conversation area, view conversation area invites, and send a brief
 * message to all selected friends.
 *
 * See relevant hooks: 'useTownController', + ADD IN OTHERS YOU USE
 *
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
    </Box>
  );
}
