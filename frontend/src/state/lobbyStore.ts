/*
 * Lobby Store
 * -----------
 * Zustand store for managing lobby, room, and matchmaking state.
 * Centralizes state that was previously scattered across PreMatchLobbyScene
 * and provides reactive updates to components.
 */

import { createStore } from 'zustand/vanilla';
import { devtools } from 'zustand/middleware';
import { CharacterType, StageType } from '@/utils/constants';
import { RoomStateData } from '@/types/Network';
import { getConnectionState } from '@/state/connectionStore';

/**
 * Lobby player interface
 */
export interface LobbyPlayer {
  id: string;
  username: string;
  character?: CharacterType;
  isReady: boolean;
  isHost: boolean;
  connected: boolean;
}

/**
 * Match preferences for matchmaking
 */
export interface MatchPreferences {
  gameMode: 'versus' | 'tournament' | 'casual';
  preferredCharacter?: CharacterType;
  preferredStage?: StageType;
  maxLatency?: number;
}

/**
 * Game configuration for rooms
 */
export interface GameConfig {
  maxPlayers: number;
  gameMode: string;
  timeLimit?: number;
  stockCount?: number;
  enableStageHazards?: boolean;
  tournamentMode?: boolean;
}

/**
 * Room state interface
 */
export interface RoomState {
  roomId: string | null;
  isHost: boolean;
  players: LobbyPlayer[];
  selectedStage: StageType | null;
  gameConfig: GameConfig;
  gameState:
    | 'waiting'
    | 'character_select'
    | 'loading'
    | 'playing'
    | 'finished';
}

/**
 * Matchmaking state interface
 */
export interface MatchmakingState {
  inQueue: boolean;
  queuePosition: number;
  estimatedWaitTime: number;
  preferences: MatchPreferences;
  searchStartTime: number | null;
}

/**
 * Local player state interface
 */
export interface LocalPlayerState {
  isReady: boolean;
  selectedCharacter: CharacterType | null;
  isConnected: boolean;
}

/**
 * Match countdown state
 */
export interface CountdownState {
  active: boolean;
  timeRemaining: number;
  message: string;
}

/**
 * Lobby store state interface
 */
interface LobbyStore {
  // Room state
  currentRoom: RoomState;

  // Matchmaking state
  matchmaking: MatchmakingState;

  // Local player state
  localPlayer: LocalPlayerState;

  // UI state
  countdown: CountdownState;
  statusMessage: string;
  isLoading: boolean;
  lastError: string | null;

  // Computed getters
  allPlayersReady: () => boolean;
  getLocalPlayer: () => LobbyPlayer | null;
  getRoomStatus: () => {
    playerCount: number;
    readyCount: number;
    hasHost: boolean;
    hasStage: boolean;
  };

  // Basic setters
  setRoomData: (roomData: Partial<RoomState>) => void;
  setMatchmakingData: (matchmakingData: Partial<MatchmakingState>) => void;
  setLocalPlayerData: (localPlayerData: Partial<LocalPlayerState>) => void;
  setCountdown: (countdown: Partial<CountdownState>) => void;
  setStatusMessage: (message: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Complex actions
  joinQueue: (preferences: MatchPreferences) => void;
  leaveQueue: () => void;
  updateFromServerState: (serverData: RoomStateData) => void;
  setPlayerReady: (ready: boolean) => void;
  selectCharacter: (character: CharacterType | null) => void;
  selectStage: (stage: StageType | null) => void;
  addPlayer: (player: LobbyPlayer) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<LobbyPlayer>) => void;
  startMatchCountdown: (seconds: number) => void;
  stopMatchCountdown: () => void;
  clearRoom: () => void;
  reset: () => void;
}

/**
 * Default game configuration
 */
const defaultGameConfig: GameConfig = {
  maxPlayers: 2,
  gameMode: 'versus',
  timeLimit: 300, // 5 minutes
  stockCount: 3,
  enableStageHazards: true,
  tournamentMode: false,
};

/**
 * Default match preferences
 */
const defaultMatchPreferences: MatchPreferences = {
  gameMode: 'versus',
  maxLatency: 100,
};

/**
 * Create the lobby store with Zustand vanilla
 */
export const lobbyStore = createStore<LobbyStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentRoom: {
        roomId: null,
        isHost: false,
        players: [],
        selectedStage: null,
        gameConfig: { ...defaultGameConfig },
        gameState: 'waiting',
      },

      matchmaking: {
        inQueue: false,
        queuePosition: 0,
        estimatedWaitTime: 0,
        preferences: { ...defaultMatchPreferences },
        searchStartTime: null,
      },

      localPlayer: {
        isReady: false,
        selectedCharacter: null,
        isConnected: false,
      },

      countdown: {
        active: false,
        timeRemaining: 0,
        message: '',
      },

      statusMessage: 'Waiting for players...',
      isLoading: false,
      lastError: null,

      // Computed getters
      allPlayersReady: () => {
        const { currentRoom } = get();
        return (
          currentRoom.players.length >= 2 &&
          currentRoom.players.every(player => player.isReady)
        );
      },

      getLocalPlayer: () => {
        const { currentRoom } = get();
        const connectionState = getConnectionState();
        const localPlayerId = connectionState.userId;

        if (!localPlayerId) return null;

        return (
          currentRoom.players.find(player => player.id === localPlayerId) ||
          null
        );
      },

      getRoomStatus: () => {
        const { currentRoom } = get();
        return {
          playerCount: currentRoom.players.length,
          readyCount: currentRoom.players.filter(p => p.isReady).length,
          hasHost: currentRoom.players.some(p => p.isHost),
          hasStage: currentRoom.selectedStage !== null,
        };
      },

      // Basic setters
      setRoomData: (roomData: Partial<RoomState>) => {
        set(
          state => ({
            currentRoom: { ...state.currentRoom, ...roomData },
          }),
          false,
          'setRoomData'
        );
      },

      setMatchmakingData: (matchmakingData: Partial<MatchmakingState>) => {
        set(
          state => ({
            matchmaking: { ...state.matchmaking, ...matchmakingData },
          }),
          false,
          'setMatchmakingData'
        );
      },

      setLocalPlayerData: (localPlayerData: Partial<LocalPlayerState>) => {
        set(
          state => ({
            localPlayer: { ...state.localPlayer, ...localPlayerData },
          }),
          false,
          'setLocalPlayerData'
        );
      },

      setCountdown: (countdownData: Partial<CountdownState>) => {
        set(
          state => ({
            countdown: { ...state.countdown, ...countdownData },
          }),
          false,
          'setCountdown'
        );
      },

      setStatusMessage: (message: string) => {
        set({ statusMessage: message }, false, 'setStatusMessage');
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading }, false, 'setLoading');
      },

      setError: (error: string | null) => {
        set({ lastError: error }, false, 'setError');
      },

      // Complex actions
      joinQueue: (preferences: MatchPreferences) => {
        set(
          state => ({
            matchmaking: {
              ...state.matchmaking,
              inQueue: true,
              preferences,
              searchStartTime: Date.now(),
              queuePosition: 0,
              estimatedWaitTime: 30, // Initial estimate
            },
            statusMessage: 'Searching for opponent...',
            isLoading: true,
          }),
          false,
          'joinQueue'
        );
      },

      leaveQueue: () => {
        set(
          state => ({
            matchmaking: {
              ...state.matchmaking,
              inQueue: false,
              queuePosition: 0,
              estimatedWaitTime: 0,
              searchStartTime: null,
            },
            statusMessage: 'Queue left',
            isLoading: false,
          }),
          false,
          'leaveQueue'
        );
      },

      updateFromServerState: (serverData: RoomStateData) => {
        console.log('LobbyStore: Updating from server state:', serverData);

        const players: LobbyPlayer[] = serverData.players.map(player => ({
          id: player.userId,
          username: player.username,
          character: player.character as CharacterType,
          isReady: player.state === 'ready',
          isHost: player.isHost,
          connected: true, // Assume connected if in server data
        }));

        set(
          state => ({
            currentRoom: {
              ...state.currentRoom,
              roomId: serverData.roomId,
              players,
              selectedStage: serverData.config.stage as StageType,
              gameConfig: {
                ...state.currentRoom.gameConfig,
                maxPlayers: serverData.config.maxPlayers,
                gameMode: serverData.config.gameMode,
                timeLimit: serverData.config.timeLimit,
                stockCount: serverData.config.stockCount,
              },
              gameState: serverData.gameState as RoomState['gameState'],
            },
            matchmaking: {
              ...state.matchmaking,
              inQueue: false, // No longer in queue if we have room data
            },
            isLoading: false,
            statusMessage: 'Room loaded successfully',
          }),
          false,
          'updateFromServerState'
        );

        // Update local player state based on server data
        const connectionState = getConnectionState();
        const localPlayerId = connectionState.userId;

        if (localPlayerId) {
          const localPlayerData = players.find(p => p.id === localPlayerId);
          if (localPlayerData) {
            set(
              state => ({
                localPlayer: {
                  ...state.localPlayer,
                  isReady: localPlayerData.isReady,
                  selectedCharacter: localPlayerData.character || null,
                  isConnected: localPlayerData.connected,
                },
                currentRoom: {
                  ...state.currentRoom,
                  isHost: localPlayerData.isHost,
                },
              }),
              false,
              'syncLocalPlayerFromServer'
            );
          }
        }
      },

      setPlayerReady: (ready: boolean) => {
        set(
          state => ({
            localPlayer: {
              ...state.localPlayer,
              isReady: ready,
            },
          }),
          false,
          'setPlayerReady'
        );
      },

      selectCharacter: (character: CharacterType | null) => {
        set(
          state => ({
            localPlayer: {
              ...state.localPlayer,
              selectedCharacter: character,
            },
          }),
          false,
          'selectCharacter'
        );
      },

      selectStage: (stage: StageType | null) => {
        set(
          state => ({
            currentRoom: {
              ...state.currentRoom,
              selectedStage: stage,
            },
          }),
          false,
          'selectStage'
        );
      },

      addPlayer: (player: LobbyPlayer) => {
        set(
          state => ({
            currentRoom: {
              ...state.currentRoom,
              players: [...state.currentRoom.players, player],
            },
          }),
          false,
          'addPlayer'
        );
      },

      removePlayer: (playerId: string) => {
        set(
          state => ({
            currentRoom: {
              ...state.currentRoom,
              players: state.currentRoom.players.filter(p => p.id !== playerId),
            },
          }),
          false,
          'removePlayer'
        );
      },

      updatePlayer: (playerId: string, updates: Partial<LobbyPlayer>) => {
        set(
          state => ({
            currentRoom: {
              ...state.currentRoom,
              players: state.currentRoom.players.map(player =>
                player.id === playerId ? { ...player, ...updates } : player
              ),
            },
          }),
          false,
          'updatePlayer'
        );
      },

      startMatchCountdown: (seconds: number) => {
        const { setCountdown, setStatusMessage } = get();

        setCountdown({
          active: true,
          timeRemaining: seconds,
          message: `Game starting in ${seconds}...`,
        });

        setStatusMessage(`Game starting in ${seconds}...`);

        // Start countdown timer
        const timer = setInterval(() => {
          const { countdown } = get();
          const newTime = countdown.timeRemaining - 1;

          if (newTime > 0) {
            setCountdown({
              timeRemaining: newTime,
              message: `Game starting in ${newTime}...`,
            });
            setStatusMessage(`Game starting in ${newTime}...`);
          } else {
            setCountdown({
              timeRemaining: 0,
              message: 'Starting now!',
            });
            setStatusMessage('Starting now!');
            clearInterval(timer);
          }
        }, 1000);
      },

      stopMatchCountdown: () => {
        set(
          state => ({
            countdown: {
              ...state.countdown,
              active: false,
              timeRemaining: 0,
              message: '',
            },
          }),
          false,
          'stopMatchCountdown'
        );
      },

      clearRoom: () => {
        set(
          state => ({
            currentRoom: {
              roomId: null,
              isHost: false,
              players: [],
              selectedStage: null,
              gameConfig: { ...defaultGameConfig },
              gameState: 'waiting',
            },
            localPlayer: {
              ...state.localPlayer,
              isReady: false,
            },
            countdown: {
              active: false,
              timeRemaining: 0,
              message: '',
            },
            statusMessage: 'Waiting for players...',
          }),
          false,
          'clearRoom'
        );
      },

      reset: () => {
        set(
          {
            currentRoom: {
              roomId: null,
              isHost: false,
              players: [],
              selectedStage: null,
              gameConfig: { ...defaultGameConfig },
              gameState: 'waiting',
            },
            matchmaking: {
              inQueue: false,
              queuePosition: 0,
              estimatedWaitTime: 0,
              preferences: { ...defaultMatchPreferences },
              searchStartTime: null,
            },
            localPlayer: {
              isReady: false,
              selectedCharacter: null,
              isConnected: false,
            },
            countdown: {
              active: false,
              timeRemaining: 0,
              message: '',
            },
            statusMessage: 'Waiting for players...',
            isLoading: false,
            lastError: null,
          },
          false,
          'reset'
        );
      },
    }),
    {
      name: 'lobby-store',
    }
  )
);

/**
 * Utility to get the store state
 */
export const getLobbyState = () => lobbyStore.getState();

/**
 * Utility to subscribe to store changes
 */
export const subscribeToLobby = (listener: (state: LobbyStore) => void) => {
  return lobbyStore.subscribe(listener);
};

/**
 * Helper functions for room-specific state
 */
export const useRoom = () => {
  const state = lobbyStore.getState();
  return {
    currentRoom: state.currentRoom,
    allPlayersReady: state.allPlayersReady(),
    getRoomStatus: state.getRoomStatus(),
    setRoomData: state.setRoomData,
    selectStage: state.selectStage,
    addPlayer: state.addPlayer,
    removePlayer: state.removePlayer,
    updatePlayer: state.updatePlayer,
    clearRoom: state.clearRoom,
  };
};

/**
 * Helper functions for matchmaking-specific state
 */
export const useMatchmaking = () => {
  const state = lobbyStore.getState();
  return {
    matchmaking: state.matchmaking,
    joinQueue: state.joinQueue,
    leaveQueue: state.leaveQueue,
    setMatchmakingData: state.setMatchmakingData,
  };
};

/**
 * Helper functions for local player state
 */
export const useLocalPlayer = () => {
  const state = lobbyStore.getState();
  return {
    localPlayer: state.localPlayer,
    getLocalPlayer: state.getLocalPlayer(),
    setPlayerReady: state.setPlayerReady,
    selectCharacter: state.selectCharacter,
    setLocalPlayerData: state.setLocalPlayerData,
  };
};

/**
 * Helper functions for UI state
 */
export const useLobbyUI = () => {
  const state = lobbyStore.getState();
  return {
    countdown: state.countdown,
    statusMessage: state.statusMessage,
    isLoading: state.isLoading,
    lastError: state.lastError,
    setCountdown: state.setCountdown,
    setStatusMessage: state.setStatusMessage,
    setLoading: state.setLoading,
    setError: state.setError,
    startMatchCountdown: state.startMatchCountdown,
    stopMatchCountdown: state.stopMatchCountdown,
  };
};
