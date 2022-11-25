import React, { useState, useEffect } from 'react'; // 'React' gets rid of eslint error
import {
  Button,
  Center,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Tag,
  TagLabel,
  useDisclosure,
} from '@chakra-ui/react';
import { usePendingConversationAreaInvites } from '../../classes/TownController';
import ConversationAreaInviteList from './ConversationAreaInviteList';
import useTownController from '../../hooks/useTownController';

/**
 * This function renders the number of Conversation Area Invites and displays this on a Button.
 * This Button, when clicked, opens a Chakra Drawer that displayes this Player's Conversation
 * Area Invites.
 * @returns {JSX.Element} A Button that opens a Drawer.
 */
export default function ConversationAreaInviteListContainer(): JSX.Element {
  const conversationAreaInvites = usePendingConversationAreaInvites();
  const townController = useTownController();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [requestCount, setRequestCount] = useState<number>(conversationAreaInvites.length);

  useEffect(() => {
    setRequestCount(conversationAreaInvites.length);
  }, [conversationAreaInvites]);

  return (
    <div style={{ paddingTop: '5px', paddingLeft: '15px' }}>
      <Button size='sm' onClick={onOpen}>
        View Your Invites
        {requestCount === 0 ? (
          <></>
        ) : (
          <Tag
            size='sm'
            borderRadius='full'
            variant='solid'
            colorScheme='red'
            style={{ marginLeft: '5px' }}>
            <TagLabel>{requestCount}</TagLabel>
          </Tag>
        )}
      </Button>
      <Drawer isOpen={isOpen} placement='left' onClose={onClose} size='lg'>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            <Center>Your Conversation Area Invites</Center>
            <Center style={{ paddingTop: '10px' }}>
              {requestCount === 0 ? (
                <></>
              ) : (
                <Button
                  colorScheme={'red'}
                  variant={'solid'}
                  size={'xs'}
                  onClick={() =>
                    townController.conversationAreaInvites.forEach(invite =>
                      townController.clickedDeclineConvAreaInvite(invite),
                    )
                  }>
                  Decline All Invitations
                </Button>
              )}
            </Center>
          </DrawerHeader>
          <DrawerBody>
            <ConversationAreaInviteList />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
