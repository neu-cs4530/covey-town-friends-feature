import { Box, Heading, ListItem, OrderedList, Tooltip } from '@chakra-ui/react';
import { truncate } from 'lodash';
import React, { useEffect, useState } from 'react';
import PlayerController from '../../classes/PlayerController';
import { useCurrentPlayerFriends, usePlayers } from '../../classes/TownController';
import useTownController from '../../hooks/useTownController';
import { Player } from '../../types/CoveyTownSocket';
import PlayerName from './PlayerName';

/**
 *
 * @param givenPlayer
 * @param playerList
 * @returns
 */
export function isPlayerInList(givenPlayer: PlayerController, playerList: PlayerController[]) {
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

export function useCurrentPlayerNotFriends(): PlayerController[] {
  const players = usePlayers();
  const friends = useCurrentPlayerFriends();
  const [playerNotFriends, setPlayerNotFriends] = useState<PlayerController[]>(players);

  useEffect(() => {
    const newNotFriends = players.filter(player => !isPlayerInList(player, friends));
    setPlayerNotFriends(newNotFriends);
  }, [friends, players]);
  return playerNotFriends;
}

/**
 * Lists the current players in the town, along with the current town's name and ID
 *
 * See relevant hooks: `usePlayersInTown`, `useCoveyAppState`, `useCurrentPlayerFriends` and
 * `useCurrentPlayerFriendRequests`
 *
 */
export default function PlayersInTownList(): JSX.Element {
  const { townID } = useTownController();
  const players = usePlayers();
  const friends = useCurrentPlayerFriends();
  // const notFriends: PlayerController[] = players.filter(player => !isPlayerInList(player, friends));
  const [playerNotFriends, setPlayerNotFriends] = useState<PlayerController[]>(players);

  useEffect(() => {
    const newNotFriends = players.filter(player => !isPlayerInList(player, friends));
    setPlayerNotFriends(newNotFriends);
  }, [friends, players]);

  const sorted = players.concat([]);
  sorted.sort((p1, p2) =>
    p1.userName.localeCompare(p2.userName, undefined, { numeric: true, sensitivity: 'base' }),
  );

  return (
    <Box>
      <Tooltip label={`Town ID: ${townID}`}>
        <Heading as='h2' fontSize='l'>
          Other Players In This Town:
        </Heading>
      </Tooltip>
      <OrderedList>
        {sorted.map(player => (
          <ListItem key={player.id}>
            <PlayerName player={player} />
          </ListItem>
        ))}
      </OrderedList>
    </Box>
  );
}

/**
 * NOTES:
 * 1. use friends and player hook to get non-friends
 * 2. use friend requests hook
 * 3. want to loop through these and for everyone check:
 *  - is it me? if yes: add "(me)" and don't add button
 *  - is it an actor in friend requests
 *    if yes: render an "accept/decline" button
 *  - is it an affected in friend requests
 *    if yes: render a "cancel" button
 *  - if none of the above: render a "friend button"
 * 4. Create all of these buttons separately, and such that
 * they call the corresponding TownControler functions when clicked.
 */
