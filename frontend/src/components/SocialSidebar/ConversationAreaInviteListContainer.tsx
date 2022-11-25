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
 * This function renders the number of Conversation Area Invites and displays that number on a
 * Button. This Button, when clicked, opens a Chakra Drawer that displayes this Player's Conversation
 * Area Invites, if this player has any, otherwise notifies this Player that they have none.
 * @returns {JSX.Element} A Button that opens a Drawer with a tag showing the number or requests
 *                        that a Player has, or no tag if they have no requests. The drawer will
 *                        have a Button allowing the Player to decline all requests if there are
 *                        greater than zero requests.
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
      <Button size='sm' onClick={onOpen} aria-label={'viewYourInvitesButton'}>
        View Your Invites
        {requestCount === 0 ? (
          <></>
        ) : (
          <Tag
            size='sm'
            borderRadius='full'
            variant='solid'
            colorScheme='red'
            style={{ marginLeft: '5px' }}
            aria-label={'requestCountTag'}>
            <TagLabel>{requestCount}</TagLabel>
          </Tag>
        )}
      </Button>
      <Drawer
        isOpen={isOpen}
        placement='left'
        onClose={onClose}
        size='lg'
        aria-label={'convAreaRequestsDrawer'}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader aria-label={'convAreaRequestsDrawerHeader'}>
            <Center>Your Conversation Area Invites</Center>
            <Center style={{ paddingTop: '10px' }}>
              {requestCount === 0 ? (
                <></>
              ) : (
                <Button
                  aria-label={'declineAllConvAreaRequestsButton'}
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
          <DrawerBody aria-label={'convAreaRequestsDrawerBody'}>
            <ConversationAreaInviteList />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
