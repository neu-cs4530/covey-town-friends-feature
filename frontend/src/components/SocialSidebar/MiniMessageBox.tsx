import { Button, Input, useToast, VStack } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react'; // gets rid of eslint error
import { useSelectedFriends } from '../../classes/TownController';
import useTownController from '../../hooks/useTownController';
import { MiniMessage } from '../../types/CoveyTownSocket';

/**
 * Creates a Chakra Button and Input text box that allows a given player to send a MiniMessage
 * to their currently selected friends.
 * @returns {JSX.Element} a Chakra VStack containing an input box and button that sends the
 *                        message input to the selected players as a Toast
 */
export default function MiniMessageBox(): JSX.Element {
  const townController = useTownController();
  const selectedFriends = useSelectedFriends();
  const [miniMessageBody, setMiniMessageBody] = useState<string>('');
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const toast = useToast();

  const attemptSendMessage = () => {
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
          title: 'No recipients selected',
          description: 'Must select at least one friend to send a MiniMessage to.',
          status: 'error',
          duration: 9000,
          isClosable: true,
          position: 'top',
        });
      }
    } else {
      toast({
        title: 'Cannot send blank message',
        description: 'Enter a message to send a MiniMessage.',
        status: 'error',
        duration: 9000,
        isClosable: true,
        position: 'top',
      });
    }
  };

  useEffect(() => {
    if (isTextareaFocused) {
      townController.pause();
    } else {
      townController.unPause();
    }
  }, [isTextareaFocused, townController]);

  return (
    <VStack align='left' mt='2'>
      <Input
        borderColor='grey.900'
        rounded='md'
        size='sm'
        placeholder='Write a MiniMessage...'
        value={miniMessageBody}
        onChange={event => setMiniMessageBody(event.target.value)}
        onFocus={() => setIsTextareaFocused(true)}
        onBlur={() => setIsTextareaFocused(false)}></Input>
      <Button
        type='submit'
        size='sm'
        onClick={async () => {
          attemptSendMessage();
        }}>
        Send MiniMessage to selected
      </Button>
    </VStack>
  );
}
