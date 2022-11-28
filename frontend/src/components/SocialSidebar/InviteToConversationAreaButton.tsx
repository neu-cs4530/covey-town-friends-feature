import { Button, useToast } from '@chakra-ui/react';
import React from 'react'; // gets rid of eslint error
import useTownController from '../../hooks/useTownController';
import { useActiveConversationAreas, useSelectedFriends } from '../../classes/TownController';

/**
 * Creates a Chakra Button element that allows a given player to request their selected
 * friends to enter the conversation area that they are currently in, if they are in one.
 * @returns {JSX.Element} a Chakra Button that invites friends to this player's location.
 */
export default function InviteToConversationAreaButton(): JSX.Element {
  const townController = useTownController();
  const selectedFriends = useSelectedFriends();
  const friendsSelected = selectedFriends.length !== 0;
  const activeConversations = useActiveConversationAreas();
  const ourPlayer = townController.ourPlayer;
  const insideArea = activeConversations.find(area => area.occupants.includes(ourPlayer));
  const toast = useToast();

  // our player is allowed to send an invitation if they are inside an active
  // Conversation Area and they have selected friends to invite.
  const isAllowedToInvite = insideArea && friendsSelected;
  let toastTitle: string;
  let toastDescription: string;

  if (isAllowedToInvite) {
    // change the toast to inform the requester (ourPlayer) that their
    // invitation is a success (in a active area and selected friends)
    toastTitle = 'Conversation Area Request Sent';
    toastDescription = `For each of the following players, a request to join you in this conversation area has been sent: ${selectedFriends.map(
      friend => ' ' + friend.userName,
    )}`;
  } else if (!insideArea) {
    // change the toast to inform the requester (ourPlayer) that their
    // invitation is unsuccessful (not in active area)
    toastTitle = 'Start or Join a Conversation Area to Send an Invitation';
    toastDescription =
      'If you are not inside an ACTIVE Conversation Area (an area with a topic defined), you cannot send an invitation. Move to a conversation area for instructions to initiate a conversation and try again.';
  } else if (!friendsSelected) {
    // change the toast to inform the requester (ourPlayer) that their
    // invitation is unsuccessful (no selected friends)
    toastTitle = 'Select Friends to Send an Invitation to this Active Conversation Area';
    toastDescription =
      'If you have not selected any friends, you cannot send an invitation. Use the checkboxes to select desired friends and try again.';
  }

  const clickedInviteToConvArea = () => {
    if (isAllowedToInvite) {
      // send the request to the TownService
      townController.clickedInviteAllToConvArea({
        requester: ourPlayer.id,
        requested: selectedFriends.map(friend => friend.id),
        requesterLocation: ourPlayer.location,
      });
    }
    // inform the player of the result of clicking the Invite Selected to Conversation Area Button
    toast({
      title: toastTitle,
      description: toastDescription,
      status: isAllowedToInvite ? 'success' : 'error',
      duration: 9000,
      isClosable: true,
      position: 'top',
    });
  };

  return (
    <div style={{ paddingTop: '10px', paddingLeft: '15px' }}>
      <Button
        size={'sm'}
        onClick={clickedInviteToConvArea}
        aria-label={'inviteSelectedToConvAreaButton'}>
        Invite Selected to Conversation Area
      </Button>
    </div>
  );
}
