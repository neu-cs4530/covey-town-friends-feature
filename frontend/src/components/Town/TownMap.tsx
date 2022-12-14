import { useToast } from '@chakra-ui/react';
import Phaser from 'phaser';
import React, { useEffect } from 'react';
import PlayerController from '../../classes/PlayerController';
import { usePlayers } from '../../classes/TownController';
import useTownController from '../../hooks/useTownController';
import { MiniMessage, PlayerToPlayerUpdate } from '../../types/CoveyTownSocket';
import SocialSidebar from '../SocialSidebar/SocialSidebar';
import NewConversationModal from './interactables/NewCoversationModal';
import TownGameScene from './TownGameScene';

export default function TownMap(): JSX.Element {
  const coveyTownController = useTownController();
  const townController = useTownController();
  const players = usePlayers();

  // Set up a toast message to be displayed when ourPlayer gains a friend via a friend
  // request being accepted.
  const toast = useToast();
  useEffect(() => {
    const renderFriendGainedToast = (acceptedRequest: PlayerToPlayerUpdate) => {
      // Find the new friend by ID, in order to get their username
      let newFriend: PlayerController | undefined;
      // OurPlayer has to be either actor or affected (otherwise no toast should be rendered)
      if (townController.ourPlayer.id === acceptedRequest.affected) {
        newFriend = players.find(playerController => playerController.id === acceptedRequest.actor);
      } else if (townController.ourPlayer.id === acceptedRequest.actor) {
        newFriend = players.find(
          playerController => playerController.id === acceptedRequest.affected,
        );
      }
      // Display the toast message if newFriend exists
      if (newFriend) {
        toast({
          title: `You have a new friend: ${newFriend.userName}!`,
          status: 'success',
          duration: 9000,
          isClosable: true,
        });
      }
    };
    townController.addListener('friendRequestAccepted', renderFriendGainedToast);
    return () => {
      townController.removeListener('friendRequestAccepted', renderFriendGainedToast);
    };
  }, [townController, toast, players]);

  // Set up a toast message to be displayed when ourPlayer recieves a MiniMessage
  useEffect(() => {
    const renderMiniMessageReceivedToast = (miniMessage: MiniMessage) => {
      // Find the sender by ID, in order to get their username
      let senderPlayer: PlayerController | undefined;
      // OurPlayer has to be a recipient (otherwise no toast should be rendered)
      const ourPlayer = miniMessage.recipients.find(
        recipientPlayerID => recipientPlayerID === townController.ourPlayer.id,
      );
      // If our player is a recipient
      if (ourPlayer) {
        senderPlayer = players.find(playerController => playerController.id === miniMessage.sender);
      }
      // Display the toast message if sender exists
      if (senderPlayer) {
        toast({
          title: `From ${senderPlayer.userName}:`,
          description: miniMessage.body,
          status: 'info',
          duration: 9000,
          isClosable: true,
          variant: 'subtle',
          position: 'top-left',
        });
      }
    };
    townController.addListener('newMiniMessageReceived', renderMiniMessageReceivedToast);
    return () => {
      townController.removeListener('newMiniMessageReceived', renderMiniMessageReceivedToast);
    };
  }, [townController, toast, players]);

  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      backgroundColor: '#000000',
      parent: 'map-container',
      render: { pixelArt: true, powerPreference: 'high-performance' },
      scale: {
        expandParent: false,
        mode: Phaser.Scale.ScaleModes.WIDTH_CONTROLS_HEIGHT,
        autoRound: true,
      },
      width: 800,
      height: 600,
      fps: { target: 30 },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 }, // Top down game, so no gravity
        },
      },
    };

    const game = new Phaser.Game(config);
    const newGameScene = new TownGameScene(coveyTownController);
    game.scene.add('coveyBoard', newGameScene, true);
    const pauseListener = newGameScene.pause.bind(newGameScene);
    const unPauseListener = newGameScene.resume.bind(newGameScene);
    coveyTownController.addListener('pause', pauseListener);
    coveyTownController.addListener('unPause', unPauseListener);
    return () => {
      coveyTownController.removeListener('pause', pauseListener);
      coveyTownController.removeListener('unPause', unPauseListener);
      game.destroy(true);
    };
  }, [coveyTownController]);

  return (
    <div id='app-container'>
      <NewConversationModal />
      <div id='map-container' />
      <div id='social-container'>
        <SocialSidebar />
      </div>
    </div>
  );
}
