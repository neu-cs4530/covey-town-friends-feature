import { Button, useToast } from '@chakra-ui/react';
import React from 'react'; // gets rid of eslint error
import useTownController from '../../hooks/useTownController';
import { useActiveConversationAreas, useSelectedFriends } from '../../classes/TownController';

/**
 * Creates a Chakra Button element that allows a given player to request their other
 * friends to enter the conversation area that they are currently in, if they are in one.
 * @returns {JSX.Element} a Chakra Button that invites friends to this player's location.
 */
export default function InviteToConversationArea(): JSX.Element {
  const townController = useTownController();
  const selectedFriends = useSelectedFriends();
  const friendsSelected = selectedFriends.length !== 0;
  const activeConversations = useActiveConversationAreas();
  const ourPlayer = townController.ourPlayer;
  const insideArea = activeConversations.find(area => area.occupants.includes(ourPlayer));
  const toast = useToast();

  const tryToInvite = () => {
    let status = true; // the default status of the success of the action being requested
    let toastTitle = 'Conversation Area Request Sent';
    let toastDescription = `For each of the following players, a request to your location has been sent: ${selectedFriends.map(
      friend => ' ' + friend.userName,
    )}`;
    if (insideArea && friendsSelected) {
      // send the request to the TownService
      townController.clickedInviteAllToConvArea({
        requester: ourPlayer.id,
        requested: selectedFriends.map(friend => friend.id),
        requesterLocation: ourPlayer.location,
      });
    } else {
      // our player is not inside an active Conversation Area or has not selected friends
      toastTitle = 'Start or Join a Conversation to Send an Invitation';
      toastDescription =
        'If you are not inside an active Conversation Area (an area with a topic defined) or have not selected any friends, you cannot send an invite to join you in a conversation. Move to a conversation area for instructions to initiate a conversation, use the checkboxes to select desired friends, and try again.';
      status = false;
    }
    // inform the player of the result of clicking the Invite Selected to Conversation Area Button
    toast({
      title: toastTitle,
      description: toastDescription,
      status: status ? 'success' : 'error',
      duration: 9000,
      isClosable: true,
      position: 'top',
    });
  };

  return (
    <div style={{ paddingTop: '10px', paddingLeft: '15px' }}>
      <Button size={'sm'} onClick={tryToInvite} aria-label={'inviteSelectedToConvAreaButton'}>
        Invite Selected to Conversation Area
      </Button>
    </div>
  );
}
