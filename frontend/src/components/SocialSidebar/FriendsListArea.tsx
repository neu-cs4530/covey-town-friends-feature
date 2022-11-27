import {
  Box,
  Button,
  Editable,
  EditableInput,
  EditablePreview,
  Heading,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { useSelectedFriends } from '../../classes/TownController';
import useTownController from '../../hooks/useTownController';
import FriendsList from './FriendsList';
import { MiniMessage } from '../../types/CoveyTownSocket';

/**
 * Lists the current friends of this TownController.ourPlayer, along with the buttons to invite
 * selected friends to a conversation area, view conversation area invites, and send a mini
 * message to all selected friends.
 *
 * See relevant hooks: 'useTownController', 'useSelectedFriends', 'useToast'
 *
 * Called in the SocialSidebar component. Uses the FriendsList component
 */
export default function FriendsInTownList(): JSX.Element {
  const townController = useTownController();
  const [miniMessageBody, setMiniMessageBody] = useState<string>('');
  const toast = useToast();
  const selectedFriends = useSelectedFriends();

  return (
    <Box>
      <Tooltip label={`Town ID: ${townController.townID}`}>
        <Heading as='h2' fontSize='l'>
          Friends:
        </Heading>
      </Tooltip>
      {FriendsList()}
      {/* {console.log(
        'This is where the create conversation area button would go. Add a button somewhere to open the drawer holding the invites.',
      )} */}
      <Editable
        defaultValue='Write a MiniMessage...'
        onClick={() => {
          townController.pause();
        }}
        onSubmit={newMessage => {
          setMiniMessageBody(newMessage);
          townController.unPause();
        }}>
        <EditablePreview />
        <EditableInput />
      </Editable>
      <Button
        type='submit'
        onClick={async () => {
          if (miniMessageBody !== '') {
            if (selectedFriends.length > 0) {
              const miniMessageToSend: MiniMessage = {
                sender: townController.ourPlayer.id,
                recipients: selectedFriends.map(friend => friend.id),
                body: miniMessageBody,
              };
              townController.clickedSendMiniMessage(miniMessageToSend);
              toast({
                title: 'MiniMessage sent!',
                description: '',
                status: 'success',
                duration: 3000,
                isClosable: true,
                position: 'top',
              });
            } else {
              toast({
                title: 'Cannot send message',
                description: 'Must select at least one friend to send a MiniMessage.',
                status: 'error',
                duration: 9000,
                isClosable: true,
                position: 'top',
              });
            }
          } else {
            toast({
              title: 'Enter a message to send a MiniMessage',
              description: 'Cannot send blank messages.',
              status: 'error',
              duration: 9000,
              isClosable: true,
              position: 'top',
            });
          }
        }}>
        Send MiniMessage to selected
      </Button>
    </Box>
  );
}
