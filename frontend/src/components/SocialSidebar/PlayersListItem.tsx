import { Button, HStack, ListItem } from '@chakra-ui/react';
import React from 'react';
import PlayerController from '../../classes/PlayerController';
import useTownController from '../../hooks/useTownController';
import PlayerName from './PlayerName';

type FriendNameProps = {
  player: PlayerController;
  buttonType: string;
};

export default function PlayersListItem({ player, buttonType }: FriendNameProps): JSX.Element {
  const townController = useTownController();

  // determine which button to render
  let button;
  if (buttonType === 'me') {
    // button = `(${buttonType})`; // TODO: figure out how to render this
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
            actor: townController.ourPlayer.toPlayerModel(),
            affected: player.toPlayerModel(),
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
            actor: townController.ourPlayer.toPlayerModel(),
            affected: player.toPlayerModel(),
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
              actor: townController.ourPlayer.toPlayerModel(),
              affected: player.toPlayerModel(),
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
              actor: townController.ourPlayer.toPlayerModel(),
              affected: player.toPlayerModel(),
            });
          }}>
          Decline Friend Request
        </Button>
      </HStack>
    );
  }

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
