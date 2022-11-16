import { useContext } from 'react';
import assert from 'assert';
import SelectedFriendsContext from '../../contexts/SelectedFriendsContext';
import PlayerController from '../../classes/PlayerController';

/**
 * Use this hook to access the current TownController. This state will change
 * when a user joins a new town, or leaves a town. Use the controller to subscribe
 * to other kinds of events that take place within the context of a town.
 */
export default function useSelectedFriends(): PlayerController[] {
  const ctx = useContext(SelectedFriendsContext);

  assert(ctx, 'SelectedFriends context should be defined in order to use this hook.');
  return ctx;
}
