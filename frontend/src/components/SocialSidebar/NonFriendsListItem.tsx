import { Button, HStack, ListItem } from '@chakra-ui/react';
import React from 'react';
import PlayerController from '../../classes/PlayerController';
import useTownController from '../../hooks/useTownController';
import PlayerName from './PlayerName';

type NonFriendPlayerProps = {
  player: PlayerController;
  buttonType: string;
};

/**
 * Represents a singular item in the list of non-friended players. Contains the player's username,
 * and associated button (send, cancel, accept/decline) OR the descriptive "(me)" to indicate
 * this particular player is the TownController.ourPlayer.
 *
 * See relevant hooks: `useTownController`
 *
 * @param props contains the player and a string indicating the button type to render
 */
export default function NonFriendsListItem({
  player,
  buttonType,
}: NonFriendPlayerProps): JSX.Element {
  const townController = useTownController();
  const buttonSize = 'xs';

  // Determine which HTML element/button to render
  let button;
  if (buttonType === 'you') {
    button = <span> ({buttonType}) &nbsp; </span>;
  } else if (buttonType === 'send') {
    button = (
      <Button
        variant={'outline'}
        colorScheme={'blue'}
        size={buttonSize}
        onClick={() => {
          townController.clickedSendRequest({
            actor: townController.ourPlayer.id,
            affected: player.id,
          });
        }}>
        Send Friend Request
      </Button>
    );
  } else if (buttonType === 'cancel') {
    button = (
      <Button
        colorScheme={'red'}
        variant={'outline'}
        size={buttonSize}
        onClick={() => {
          townController.clickedCancelRequest({
            actor: townController.ourPlayer.id,
            affected: player.id,
          });
        }}>
        Cancel Friend Request
      </Button>
    );
  } else if (buttonType === 'accept/decline') {
    button = (
      <HStack>
        <Button
          colorScheme={'blue'}
          size={buttonSize}
          onClick={() => {
            townController.clickedAcceptFriendRequest({
              actor: townController.ourPlayer.id,
              affected: player.id,
            });
          }}>
          Accept Friend Request
        </Button>
        <Button
          colorScheme={'red'}
          size='xs'
          onClick={() => {
            townController.clickedDeclineFriendRequest({
              actor: townController.ourPlayer.id,
              affected: player.id,
            });
          }}>
          Decline
        </Button>
      </HStack>
    );
  }

  // Includes a space between PlayerName and button so they're not glued to each other
  return (
    <ListItem key={player.id} style={{ paddingTop: '5px' }}>
      <HStack>
        <PlayerName player={player} />
        <span> </span>
        {button}
      </HStack>
    </ListItem>
  );
}
