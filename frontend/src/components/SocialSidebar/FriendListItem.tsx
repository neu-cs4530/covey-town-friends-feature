import { Button, Checkbox, HStack, ListItem } from '@chakra-ui/react';
import React, { useState } from 'react';
import PlayerController from '../../classes/PlayerController';
import { useSelectedFriends } from '../../classes/TownController';
import useTownController from '../../hooks/useTownController';

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
  const buttonSize = 'xs';
  const buttonVariant = 'outline';

  // handle selecting or deselecting a friend
  function selectOrDeselect(newSelectedValue: boolean) {
    setChecked(newSelectedValue);
    if (newSelectedValue) {
      townController.selectFriend(player);
    } else {
      townController.deselectFriend(player);
    }
  }

  // space between playername and button is to separate button from name
  return (
    <ListItem style={{ paddingTop: '5px' }}>
      <HStack>
        <Checkbox
          size='md'
          isChecked={checked}
          onChange={e => {
            selectOrDeselect(e.target.checked);
          }}>
          {player.userName}
        </Checkbox>
        <Button
          colorScheme={'blue'}
          variant={buttonVariant}
          size={buttonSize}
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
          colorScheme={'red'}
          variant={buttonVariant}
          size={buttonSize}
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
