import React from 'react';
import Phaser from 'phaser';
import { useEffect } from 'react';
import useTownController from '../../hooks/useTownController';
import SocialSidebar from '../SocialSidebar/SocialSidebar';
import NewConversationModal from './interactables/NewCoversationModal';
import TownGameScene from './TownGameScene';
import { usePlayers } from '../../classes/TownController';
import { useToast } from '@chakra-ui/react';
import { PlayerToPlayerUpdate } from '../../types/CoveyTownSocket';
import PlayerController from '../../classes/PlayerController';

export default function TownMap(): JSX.Element {
  const coveyTownController = useTownController();
  const townController = useTownController();
  const players = usePlayers();

  // Set up a toast message to be displayed when ourPlayer gains a friend via a friend
  // request being accepted.
  const toast = useToast();
  useEffect(() => {
    const renderFriendGainedToast = (acceptedRequest: PlayerToPlayerUpdate) => {
      // Find the new friend by ID, in order to get its username
      const newFriend = players.find(
        playerController => playerController.id === acceptedRequest.actor,
      ) as PlayerController;
      // Display the toast message
      toast({
        title: `You have a new friend: ${newFriend.userName}!`,
        status: 'success',
        duration: 9000,
        isClosable: true,
      });
    };
    // Event only gets emitted if ourPlayer is the affected so no need to check for that here
    townController.addListener('friendRequestAccepted', renderFriendGainedToast);
    return () => {
      townController.removeListener('friendRequestAccepted', renderFriendGainedToast);
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
