import { Button, ButtonGroup, Td, Tr } from '@chakra-ui/react';
import React from 'react'; // gets rid of eslint error
import useTownController from '../../hooks/useTownController';
import { TeleportInviteSingular } from '../../types/CoveyTownSocket';

/**
 * Renders a Chakra Table Row in which the requesting player from the invite parameter,
 * the requesters Residing Conversation Area's name, as well as Buttons that allow
 * this Player to accept or deny the request to teleport to the given requester's location.
 * @param {TeleportInviteSingular} invite is the Conversation Area invite being displayed
 * @returns {JSX.Element} a Table Row containing Buttons allowing this Player to accept
 *                        or deny the Conversation Area invite.
 */
export default function ConversationAreaInviteItem({
  requester,
  requested,
  requesterLocation,
}: TeleportInviteSingular): JSX.Element {
  const townController = useTownController();
  const conversationAreas = townController.conversationAreas;
  const invite = { requester, requested, requesterLocation };

  // this allows us to get the requesting Player's userName, as the TeleportInviteSingular
  // only includes an id as the 'requester' and this would not be enough information
  // for the requested to understand who was inviting them to the area.
  const requestingPlayerUserName = conversationAreas
    .find(area => area.occupants.map(player => player.id).includes(requester))
    ?.occupants.find(occupant => occupant.id === requester)?.userName;

  const buttonColor = 'blue';
  const buttonSize = 'xs';

  return (
    <Tr>
      <Td>{requestingPlayerUserName}</Td>
      <Td>{requesterLocation.interactableID}</Td>
      <Td>
        <ButtonGroup isAttached variant={'outline'}>
          <Button
            colorScheme={buttonColor}
            variant={'solid'}
            size={buttonSize}
            onClick={() => {
              townController.ourPlayer.updateSpritePosition(requesterLocation);
              townController.clickedAcceptConvAreaInvite(invite);
            }}>
            Accept and Go
          </Button>
          <Button
            colorScheme={buttonColor}
            size={buttonSize}
            onClick={() => townController.clickedDeclineConvAreaInvite(invite)}>
            Decline
          </Button>
        </ButtonGroup>
      </Td>
    </Tr>
  );
}
