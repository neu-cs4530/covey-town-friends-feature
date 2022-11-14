import { Heading, StackDivider, VStack } from '@chakra-ui/react';
import React from 'react';
import ConversationAreasList from './ConversationAreasList';
import PlayersList from './PlayersList';
import FriendsList from './FriendsList';
import useTownController from '../../hooks/useTownController';

export default function SocialSidebar(): JSX.Element {
  const { friendlyName, townID } = useTownController();

  return (
    <VStack
      align='left'
      spacing={2}
      border='2px'
      padding={2}
      marginLeft={2}
      borderColor='gray.500'
      height='100%'
      divider={<StackDivider borderColor='gray.200' />}
      borderRadius='4px'>
      <Heading fontSize='xl' as='h1'>
        Current town: {friendlyName}
      </Heading>
      <FriendsList />
      <PlayersList />
      <ConversationAreasList />
    </VStack>
  );
}
