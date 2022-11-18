import React, { useState } from 'react';
import Phaser from 'phaser';
import { useEffect } from 'react';
import useTownController from '../../hooks/useTownController';
import SocialSidebar from '../SocialSidebar/SocialSidebar';
import NewConversationModal from './interactables/NewCoversationModal';
import TownGameScene from './TownGameScene';
import { useCurrentPlayerFriends } from '../../classes/TownController';
import { useToast } from '@chakra-ui/react';

export default function TownMap(): JSX.Element {
  const coveyTownController = useTownController();
  const friends = useCurrentPlayerFriends();

  // Set up a toast message to be displayed when ourPlayer gains a friend
  const toast = useToast();
  const [friendsLength, setFriendsLength] = useState<number>(friends.length);
  useEffect(() => {
    // Make sure we don't enter an infinite loop
    if (friendsLength !== friends.length) {
      const dif = friends.length - friendsLength;
      // Render toast message if friend list has increased
      if (dif > 0) {
        toast({
          title: `You have a new friend!`,
          status: 'success',
          duration: 9000,
          isClosable: true,
        });
      }
      // Update friends length - this will cause this use effect to be called again, but the if-
      // statement prevents a duplicate toast rendering
      setFriendsLength(friends.length);
    }
  }, [friends, friendsLength, toast]);

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
