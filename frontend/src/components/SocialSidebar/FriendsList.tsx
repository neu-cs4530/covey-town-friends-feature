import { Box, Heading, OrderedList, Tooltip } from '@chakra-ui/react';
import React from 'react';
import { useCurrentPlayerFriends, usePlayers } from '../../classes/TownController';
import useTownController from '../../hooks/useTownController';
import FriendsListItem from './FriendListItem';

function FriendsList(): JSX.Element {
  const friends = usePlayers();
  const sorted = friends.concat([]);

  sorted.sort((p1, p2) =>
    p1.userName.localeCompare(p2.userName, undefined, { numeric: true, sensitivity: 'base' }),
  );

  return (
    <Box>
      <Box height='200px' color='black'>
        buffer
      </Box>
      <OrderedList>
        {sorted.map(player => (
          <FriendsListItem player={player} key={player.id} />
        ))}
      </OrderedList>
    </Box>
  );
}

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
      {FriendsList()}
      {console.log(
        'This is where the create conversation area button would go. Add a button somewhere to open the drawer holding the invites.',
      )}
      {console.log('This is where the text entry box + associated button would go.')}
    </Box>
  );
}
