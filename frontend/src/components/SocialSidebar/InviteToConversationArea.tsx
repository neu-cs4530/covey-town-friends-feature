import { Button, useToast } from '@chakra-ui/react';
import React from 'react'; // gets rid of eslint error
import useTownController from '../../hooks/useTownController';
import { useActiveConversationAreas, useSelectedFriends } from '../../classes/TownController';

/**
 * Creates a Chakra Button element that allows a given player to request their other
 * friends to enter the coversation area that they are currently in, if they are in one.
 * @returns {JSX.Element} a Chakra Button that invites friends to this player's location.
 */
export default function InviteToConversationArea(): JSX.Element {
  const townController = useTownController();
  const selectedFriends = useSelectedFriends();
  const activeConversations = useActiveConversationAreas();
  const toast = useToast();
  const ourPlayer = townController.ourPlayer;

  const tryToInvite = () => {
    let toastTitle;
    let toastDescription;
    if (activeConversations.find(area => area.occupants.includes(ourPlayer))) {
      townController.clickedInviteAllToConvArea({
        requester: ourPlayer.id,
        requested: selectedFriends.map(friend => friend.id),
        requesterLocation: ourPlayer.location,
      });
      toastTitle = 'Conversation Area Request Sent';
      toastDescription = `For each of the following players, a request to your location has been sent: [${selectedFriends.map(
        friend => friend.userName + ', ',
      )}]`;
    } else {
      toastTitle = 'Start or Join a Conversation to Send an Invitation';
      toastDescription =
        'If you are not inside an active Conversation Area (an area with a topic defined), you cannot invite your friends to join you in a conversation. Move to a conversation area for instructions to initiate a conversation, use the checkboxes to select desired friends, and try again.';
    }
    toast({
      title: toastTitle,
      description: toastDescription,
      status: 'success',
      duration: 9000,
      isClosable: true,
      position: 'top',
    });
  };

  return (
    <div style={{ paddingTop: '5px', paddingLeft: '15px' }}>
      <Button size={'sm'} onClick={tryToInvite}>
        Invite Selected to Conversation Area
      </Button>
    </div>
  );
}
