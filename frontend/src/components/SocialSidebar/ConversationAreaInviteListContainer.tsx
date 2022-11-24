import React, { useState, useEffect } from 'react'; // 'React' gets rid of eslint error
import { Button, Drawer, Tag, TagLabel, useDisclosure } from '@chakra-ui/react';
import { usePendingConversationAreaInvites } from '../../classes/TownController';
import ConversationAreaInviteList from './ConversationAreaInviteList';

/**
 * This function renders the number of Conversation Area Invites and displays this on a Button.
 * This Button, when clicked, opens a Chakra Drawer that displayes a Table where each row is
 * one of this Player's Conversation Area Invites.
 * @returns {JSX.Element} A Button that opens a Drawer containing this players conversation area
 *                        invitations.
 */
export default function ConversationAreaInviteListContainer(): JSX.Element {
  const conversationAreaInvites = usePendingConversationAreaInvites();
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
        <ConversationAreaInviteList />
      </Drawer>
    </div>
  );
}
