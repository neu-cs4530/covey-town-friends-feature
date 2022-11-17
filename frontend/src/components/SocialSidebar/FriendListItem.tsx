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
            console.log('TODO: remove log. Clicked teleport to friend');
            console.log(townController.ourPlayer.location);

            townController.ourPlayer.gameObjects?.sprite.setX(player.location.x);
            townController.ourPlayer.gameObjects?.sprite.setY(player.location.y);
            townController.ourPlayer.gameObjects?.label.setX(player.location.x);
            townController.ourPlayer.gameObjects?.label.setY(player.location.y - 20);

            townController.clickedTeleportToFriend({
              actor: townController.ourPlayer.id,
              playerDestinationLocation: player.location,
            });

            console.log(townController.ourPlayer.location);
          }}>
          Teleport To Friend
        </Button>
        <Button
          background='red.200'
          outlineOffset={'--px'}
          outlineColor='black'
          size='xs'
          onClick={() => {
            console.log('TODO: remove log. Clicked unfriend for ' + player.userName);
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
