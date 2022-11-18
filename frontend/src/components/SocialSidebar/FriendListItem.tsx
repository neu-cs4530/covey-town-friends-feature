import { Button, Checkbox, HStack, ListItem } from '@chakra-ui/react';
import React, { useState } from 'react';
import PlayerController from '../../classes/PlayerController';
import { useSelectedFriends } from '../../classes/TownController';
import useTownController from '../../hooks/useTownController';

type FriendNameProps = {
  player: PlayerController;
};

export default function FriendsListItem({ player }: FriendNameProps): JSX.Element {
  const townController = useTownController();
  const selectedFriends = useSelectedFriends();

  const [checked, setChecked] = useState<boolean>(selectedFriends.includes(player));

  // handle selecting or deselecting a friend
  function selectOrDeslect(newValue: boolean) {
    console.log('newValue is ' + newValue + ' for ' + player.userName);
    setChecked(newValue);
    if (newValue) {
      townController.selectFriend(player);
    } else {
      townController.deselectFriend(player);
    }
  }

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
          size='xs'
          onClick={() => {
            // move the sprite and label
            townController.ourPlayer.updateSpritePosition(player.location);
            // tell the town we teleported
            townController.clickedTeleportToFriend(player.location);
          }}>
          Teleport To Friend
        </Button>
        <Button
          background='red.200'
          outlineOffset={'--px'}
          outlineColor='black'
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
