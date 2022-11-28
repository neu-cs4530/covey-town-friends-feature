import { Button, HStack, Input, useToast } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react'; // gets rid of eslint error
import { useSelectedFriends } from '../../classes/TownController';
import useTownController from '../../hooks/useTownController';
import { MiniMessage } from '../../types/CoveyTownSocket';

/**
 * Creates a Chakra Button and Input text box that allows a given player to send a MiniMessage
 * to their currently selected friends. It fails to send a message in 3 situations:
 *  1) Message is blank
 *  2) Message is too many characters (>140)
 *  3) No friends have been selected
 * @returns {JSX.Element} a Chakra VStack containing an input box and button that sends the
 *                        message input to the selected players as a Toast
 */
export default function MiniMessageBox(): JSX.Element {
  const townController = useTownController();
  const selectedFriends = useSelectedFriends();
  const [miniMessageBody, setMiniMessageBody] = useState<string>('');
  // Represents whether our player has clicked on the input box.
  // Default is false - the player is not currently trying to type in the input box
  const [isInputFocused, setIsInputFocused] = useState(false);
  const toast = useToast();

  const attemptSendMessage = () => {
    let toastTitle = '';
    let toastDescription = '';
    let toastStatus: 'success' | 'error' | 'info' | 'warning' | undefined = 'error';
    let toastDuration = 9000;
    const toastPosition = 'top';
    const toastCharacterLimit = 140;

    // If message is not blank
    if (miniMessageBody.length > 0) {
      // If message is within 140 characters
      if (miniMessageBody.length <= toastCharacterLimit) {
        // If at least 1 friend is selected
        if (selectedFriends.length > 0) {
          const miniMessageToSend: MiniMessage = {
            sender: townController.ourPlayer.id,
            recipients: selectedFriends.map(friend => friend.id),
            body: miniMessageBody,
          };
          townController.clickedSendMiniMessage(miniMessageToSend);
          toastTitle = 'MiniMessage sent!';
          toastStatus = 'success';
          toastDuration = 3000;
        } else {
          toastTitle = 'No recipients selected';
          toastDescription = 'Must select at least one friend to send a MiniMessage to.';
        }
      } else {
        toastTitle = 'Message too long';
        toastDescription = 'MiniMessages cannot exceed 140 characters.';
      }
    } else {
      toastTitle = 'Message is blank';
      toastDescription = 'Enter a message to send a MiniMessage.';
    }

    toast({
      title: toastTitle,
      description: toastDescription,
      status: toastStatus,
      duration: toastDuration,
      isClosable: true,
      position: toastPosition,
    });
  };

  // Prevents player from moving when typing in the input box, and allows player to move again
  // once they have clicked out of the input box
  useEffect(() => {
    if (isInputFocused) {
      townController.pause();
    } else {
      townController.unPause();
    }
  }, [isInputFocused, townController]);

  // Allows "enter" key to send the message
  const handleReturnKeyPress = (event: React.KeyboardEvent) => {
    if (isInputFocused && event.key === 'Enter') {
      event.preventDefault();
      attemptSendMessage();
    }
  };

  return (
    <HStack align='left' mt='4'>
      <Input
        borderColor='grey.900'
        rounded='md'
        size='sm'
        placeholder='Write a MiniMessage...'
        value={miniMessageBody}
        onChange={event => setMiniMessageBody(event.target.value)}
        onFocus={() => setIsInputFocused(true)}
        onBlur={() => setIsInputFocused(false)}
        onKeyPress={handleReturnKeyPress}></Input>
      <Button
        title='Send MiniMessage to selected friends'
        type='submit'
        size='sm'
        onClick={async () => {
          attemptSendMessage();
        }}>
        Send
      </Button>
    </HStack>
  );
}
