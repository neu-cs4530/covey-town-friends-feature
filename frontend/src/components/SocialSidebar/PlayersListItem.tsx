import { Button, HStack, ListItem } from '@chakra-ui/react';
import React from 'react';
import PlayerController from '../../classes/PlayerController';
import useTownController from '../../hooks/useTownController';
import PlayerName from './PlayerName';

type NotFriendPlayerProps = {
  player: PlayerController;
  buttonType: string;
};

/**
 * Represents a singular item in the list of not-friended players. Contains the player's username,
 * and associated button (send, cancel, accept/decline) OR the descriptive "(me)" to indicate
 * this particular player is the TownController.ourPlayer.
 *
 * @param param0 contains the player and a string indicating the button type to render
 */
export default function PlayersListItem({ player, buttonType }: NotFriendPlayerProps): JSX.Element {
  const townController = useTownController();

  // Determine which HTML element/button to render
  let button;
  if (buttonType === 'me') {
    button = <span> ({buttonType}) &nbsp; </span>;
  } else if (buttonType === 'send') {
    button = (
      <Button
        outlineOffset={'--px'}
        outlineColor='black'
        style={{ height: '15px' }}
        size='xs'
        onClick={() => {
          console.log('TODO: remove log. Clicked send friend request');
          townController.clickedSendRequest({
            actor: townController.ourPlayer.id,
            affected: player.id,
          });
        }}>
        Request as Friend
      </Button>
    );
  } else if (buttonType === 'cancel') {
    button = (
      <Button
        outlineOffset={'--px'}
        outlineColor='black'
        style={{ height: '15px' }}
        size='xs'
        onClick={() => {
          console.log('TODO: remove log. Clicked cancel friend request');
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
          background='green.200'
          outlineOffset={'--px'}
          outlineColor='black'
          style={{ height: '15px' }}
          size='xs'
          onClick={() => {
            console.log('TODO: remove log. Clicked accept friend request');
            townController.clickedAcceptFriendRequest({
              actor: townController.ourPlayer.id,
              affected: player.id,
            });
          }}>
          Accept Friend Request
        </Button>
        <Button
          background='red.200'
          outlineOffset={'--px'}
          outlineColor='black'
          style={{ height: '15px' }}
          size='xs'
          onClick={() => {
            console.log('TODO: remove log. Clicked decline friend request');
            townController.clickedDeclineFriendRequest({
              actor: townController.ourPlayer.id,
              affected: player.id,
            });
          }}>
          Decline Friend Request
        </Button>
      </HStack>
    );
  }

  // Includes a space between PlayerName and button so they're not glued to each other
  return (
    <ListItem>
      <HStack>
        <PlayerName player={player} />
        <li></li>
        {button}
      </HStack>
    </ListItem>
  );
}
