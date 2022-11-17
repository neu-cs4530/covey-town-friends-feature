import { Box, Heading, OrderedList } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import PlayerController from '../../classes/PlayerController';
import {
  useCurrentPlayerFriendRequests,
  useCurrentPlayerFriends,
  usePlayers,
} from '../../classes/TownController';
import useTownController from '../../hooks/useTownController';
import PlayersListItem from './PlayersListItem';

/**
 * Determine whether or not a given PlayerController is in a given list of PlayerControllers
 * @param givenPlayer the PlayerController to check for in the provided list
 * @param playerList the list of PlayerControllers
 * @returns true if the player is in the list, false otherwise
 */
export function playerIsInList(givenPlayer: PlayerController, playerList: PlayerController[]) {
  // attempt to find the equivalent givenPlayer in playerList
  const givenPlayerInList = playerList.find(
    controller => controller.id === givenPlayer.id,
  ) as PlayerController;

  // If found, return true, else false
  if (givenPlayerInList) {
    return true;
  } else {
    return false;
  }
}

/**
 * Lists the current not-friended players in the town (via their username), along with buttons
 * to send/cancel/accept/decline friend requests.
 *
 * See relevant hooks: `usePlayersInTown`, `useCoveyAppState`, `useCurrentPlayerFriends` and
 * `useCurrentPlayerFriendRequests`
 *
 */
export default function PlayersInTownList(): JSX.Element {
  const townController = useTownController();
  const players = usePlayers();
  const friends = useCurrentPlayerFriends();
  const friendRequests = useCurrentPlayerFriendRequests();

  // Set up a not-friends list to be updated every time the players and/or friends list changes
  const [playerNotFriends, setPlayerNotFriends] = useState<PlayerController[]>(players);
  useEffect(() => {
    // the new not-friends list should include any player in the Town that is not the friends list
    const newNotFriends = players.filter(player => !playerIsInList(player, friends));
    setPlayerNotFriends(newNotFriends);
  }, [friends, players]);

  // Sort the not-friends list to be passed in
  const sorted = playerNotFriends.concat([]);
  sorted.sort((p1, p2) =>
    p1.userName.localeCompare(p2.userName, undefined, { numeric: true, sensitivity: 'base' }),
  );

  // Determine which button to use/render for the given player
  function associatedButton(player: PlayerController): string {
    // If the given Player is "me", we don't want to render any button next to it
    if (player.id == townController.ourPlayer.id) {
      return 'me';
    }
    // Loop through friend requests and check if given player is in any of them
    for (const request of friendRequests) {
      if (player.id === request.actor) {
        return 'accept/decline';
      } else if (player.id === request.affected) {
        return 'cancel';
      }
    }
    // If the player is not found in the friend requests' list
    return 'send';
  }

  return (
    <Box>
      <Heading as='h2' fontSize='l'>
        Other Players In This Town:
      </Heading>
      <OrderedList>
        {sorted.map(player => (
          <PlayersListItem player={player} key={player.id} buttonType={associatedButton(player)} />
        ))}
      </OrderedList>
    </Box>
  );
}
