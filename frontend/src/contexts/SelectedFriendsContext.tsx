import React from 'react';
import PlayerController from '../classes/PlayerController';

const context = React.createContext<PlayerController[]>([]);

export default context;
