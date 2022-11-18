import { OrderedList } from '@chakra-ui/react';
import React from 'react';
import { useCurrentPlayerFriends } from '../../classes/TownController';
import FriendsListItem from './FriendListItem';

/**
 * This is a function component for just the elements in the friends section of the UI.
 * Renders their buttons for select/deselect, Teleport To Friend and Remove Friend
 *
 * @returns JSX.Element for the OrderedListItem for the Friends section
 *
 * See useCurrentPlayerFriends() hook
 * Used in FriendsListArea component
 * Uses FriendsListItem component
 */
function FriendsList(): JSX.Element {
  const friends = useCurrentPlayerFriends();
  const sorted = friends.concat([]);

  // sorts friends so they are rendered alphabetically
  sorted.sort((p1, p2) =>
    p1.userName.localeCompare(p2.userName, undefined, { numeric: true, sensitivity: 'base' }),
  );

  return (
    <OrderedList>
      {sorted.map(player => (
        <FriendsListItem player={player} key={player.id} />
      ))}
    </OrderedList>
  );
}
