import { Button, Checkbox, HStack, ListItem } from '@chakra-ui/react';
import React, { useState } from 'react';
import PlayerController from '../../classes/PlayerController';
import { useSelectedFriends } from '../../classes/TownController';
import useTownController from '../../hooks/useTownController';
import PlayerName from './PlayerName';

type FriendNameProps = {
  player: PlayerController;
};

/**
 * A React Component to render one PlayerController in the FriendsList
 *
 * @param props PlayerController that we are rendering as a friend
 * @returns JSX.Element Representing one item for a friend on our FriendsList
 *
 * See useTownController(), useSelectedFriends()
 *
 * Used in FriendsList component
 */
export default function FriendsListItem({ player }: FriendNameProps): JSX.Element {
  const townController = useTownController();
  const selectedFriends = useSelectedFriends();

  const [checked, setChecked] = useState<boolean>(selectedFriends.includes(player));

  // handle selecting or deselecting a friend
  function selectOrDeslect(newValue: boolean) {
    setChecked(newValue);
    if (newValue) {
      townController.selectFriend(player);
    } else {
      townController.deselectFriend(player);
    }
  }

  // space between playername and button is so separate button from name
  return (
    <ListItem>
      <HStack>
        <Checkbox
          size='md'
          isChecked={checked}
          onChange={e => {
            selectOrDeslect(e.target.checked);
          }}>
          {player.userName}
        </Checkbox>
        <Button
          outlineOffset={'--px'}
          outlineColor='black'
          style={{ height: '15px' }}
          size='xs'
          title='Teleport to this friend'
          onClick={() => {
            // move ourPlayer sprite and label
            townController.ourPlayer.updateSpritePosition(player.location);
            // tells the town we moved, letting other players know, rendering us correctly on their end
            townController.clickedTeleportToFriend(player.location);
          }}>
          Teleport
        </Button>
        <Button
          background='red.200'
          outlineOffset={'--px'}
          outlineColor='black'
          style={{ height: '15px' }}
          size='xs'
          onClick={() => {
            townController.clickedRemoveFriend({
              actor: townController.ourPlayer.id,
              affected: player.id,
            });
          }}>
          Unfriend
        </Button>
      </HStack>
    </ListItem>
  );
}
