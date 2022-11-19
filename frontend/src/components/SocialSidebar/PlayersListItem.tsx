import { Button, HStack, ListItem, useToast } from '@chakra-ui/react';
import React from 'react';
import PlayerController from '../../classes/PlayerController';
import useTownController from '../../hooks/useTownController';
import PlayerName from './PlayerName';

type NonFriendPlayerProps = {
  player: PlayerController;
  buttonType: string;
};

/**
 * Represents a singular item in the list of not-friended players. Contains the player's username,
 * and associated button (send, cancel, accept/decline) OR the descriptive "(me)" to indicate
 * this particular player is the TownController.ourPlayer.
 *
 * See relevant hooks: `useTownController`
 *
 * @param props contains the player and a string indicating the button type to render
 */
export default function PlayersListItem({ player, buttonType }: NonFriendPlayerProps): JSX.Element {
  const townController = useTownController();
  const toast = useToast();

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
            townController.clickedAcceptFriendRequest({
              actor: townController.ourPlayer.id,
              affected: player.id,
            });
            // Display a toast message indicating our player gained a friend
            toast({
              title: `You have a new friend: ${player.userName}!`,
              status: 'success',
              duration: 9000,
              isClosable: true,
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
    <ListItem key={player.id}>
      <HStack>
        <PlayerName player={player} />
        <span> </span>
        {button}
      </HStack>
    </ListItem>
  );
}