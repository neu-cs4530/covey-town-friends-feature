import { Heading, StackDivider, Tooltip, VStack } from '@chakra-ui/react';
import React from 'react';
import ConversationAreasList from './ConversationAreasList';
import FriendsList from './FriendsList';
import useTownController from '../../hooks/useTownController';
import NonFriendsInTownList from './NonFriendsListArea';

/**
 * Displays the current town name & ID, lists the not-friended players in the Town, lists
 * the friended players in the Town, and lists the active conversation areas.
 *
 * Also includes buttons for sending mini-messages to friends, teleporting to them, and opening
 * a list of conversation area invites.
 *
 */
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
      width='105%'
      divider={<StackDivider borderColor='gray.200' />}
      borderRadius='4px'>
      <Tooltip label={`Town ID: ${townID}`}>
        <Heading as='h1' fontSize='xl'>
          Current town: {friendlyName}
        </Heading>
      </Tooltip>
      <FriendsList />
      <NonFriendsInTownList />
      <ConversationAreasList />
    </VStack>
  );
}
