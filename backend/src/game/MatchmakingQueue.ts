import type {
  AuthenticatedSocket,
  MatchPreferences,
  QueuedPlayer,
  GameRoomConfig,
} from '../types';
import { SocketManager } from '../networking/SocketManager';
import { GameRoom } from './GameRoom';

export interface MatchFoundEvent {
  players: QueuedPlayer[];
  room: GameRoom;
  estimatedStartTime: Date;
}

export enum QueueStatus {
  SEARCHING = 'searching',
  MATCH_FOUND = 'match_found',
  ERROR = 'error',
}

export interface QueueStatusUpdate {
  status: QueueStatus;
  position?: number;
  estimatedWaitTime?: number;
  playersInQueue?: number;
  message?: string;
  queueStats?: {
    totalPlayers: number;
    averageWaitTime: number;
    estimatedMatchTime: number;
  };
}

export interface RoomRegistrationCallback {
  (roomId: string, gameRoom: GameRoom): void;
}

export class MatchmakingQueue {
  // eslint-disable-next-line no-use-before-define
  private static instance: MatchmakingQueue;

  private queue: Map<string, QueuedPlayer>;

  private readonly matchSize: number = 4;

  private readonly maxWaitTime: number = 60000; // 60 seconds

  private matchmakingInterval: NodeJS.Timeout | null = null;

  private queueBroadcastInterval: NodeJS.Timeout | null = null;

  private roomRegistrationCallback?: RoomRegistrationCallback;

  private socketManager?: SocketManager;

  private constructor() {
    this.queue = new Map();
    this.startMatchmaking();
    this.startQueueBroadcasting();
  }

  public static getInstance(): MatchmakingQueue {
    if (!MatchmakingQueue.instance) {
      MatchmakingQueue.instance = new MatchmakingQueue();
    }
    return MatchmakingQueue.instance;
  }

  /**
   * Set callback for room registration with external system
   */
  public setRoomRegistrationCallback(callback: RoomRegistrationCallback): void {
    this.roomRegistrationCallback = callback;
  }

  /**
   * Set the SocketManager instance for GameRoom creation
   */
  public setSocketManager(socketManager: SocketManager): void {
    this.socketManager = socketManager;
  }

  /**
   * Add a player to the matchmaking queue
   */
  public addPlayer(
    socket: AuthenticatedSocket,
    preferences?: MatchPreferences
  ): { success: boolean; error?: string } {
    if (!socket.userId || !socket.username) {
      return { success: false, error: 'Socket must be authenticated' };
    }

    // Check if player is already in queue
    if (this.queue.has(socket.userId)) {
      return { success: false, error: 'Player already in queue' };
    }

    const queuedPlayer: QueuedPlayer = {
      socket,
      userId: socket.userId,
      username: socket.username,
      queuedAt: new Date(),
      ...(preferences && { preferences }),
    };

    this.queue.set(socket.userId, queuedPlayer);

    // Send initial queue status
    this.sendQueueStatusUpdate(socket.userId);

    // Send welcome notification
    this.sendQueueWelcomeNotification(socket);

    // Broadcast updated queue count to all players
    this.broadcastQueueUpdate();

    // Check for queue milestone
    this.checkQueueMilestone();

    console.log(`Player ${socket.username} joined matchmaking queue`);
    return { success: true };
  }

  /**
   * Remove a player from the matchmaking queue
   */
  public removePlayer(userId: string): {
    success: boolean;
    player?: QueuedPlayer;
  } {
    const player = this.queue.get(userId);
    if (!player) {
      return { success: false };
    }

    this.queue.delete(userId);

    // Broadcast updated queue count
    this.broadcastQueueUpdate();

    console.log(`Player ${player.username} left matchmaking queue`);
    return { success: true, player };
  }

  /**
   * Get current queue status for a player
   */
  public getPlayerQueueStatus(userId: string): QueueStatusUpdate | null {
    const player = this.queue.get(userId);
    if (!player) {
      return null;
    }

    const queueArray = Array.from(this.queue.values());
    const position = queueArray.findIndex(p => p.userId === userId) + 1;
    const estimatedWaitTime = this.calculateEstimatedWaitTime(position);

    const queueStats = this.getQueueStats();

    return {
      status: QueueStatus.SEARCHING,
      position,
      estimatedWaitTime,
      playersInQueue: queueArray.length,
      queueStats: {
        totalPlayers: queueStats.totalPlayers,
        averageWaitTime: queueStats.averageWaitTime,
        estimatedMatchTime: this.calculateEstimatedMatchTime(),
      },
    };
  }

  /**
   * Get all players currently in queue
   */
  public getQueuedPlayers(): QueuedPlayer[] {
    return Array.from(this.queue.values());
  }

  /**
   * Get queue size
   */
  public getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Check if a player is in queue
   */
  public isPlayerInQueue(userId: string): boolean {
    return this.queue.has(userId);
  }

  /**
   * Start the matchmaking process
   */
  private startMatchmaking(): void {
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval);
    }

    // Run matchmaking every 2 seconds
    this.matchmakingInterval = setInterval(() => {
      this.attemptMatching();
    }, 2000);
  }

  /**
   * Stop the matchmaking process
   */
  public stopMatchmaking(): void {
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval);
      this.matchmakingInterval = null;
    }

    if (this.queueBroadcastInterval) {
      clearInterval(this.queueBroadcastInterval);
      this.queueBroadcastInterval = null;
    }
  }

  /**
   * Start periodic queue status broadcasting
   */
  private startQueueBroadcasting(): void {
    if (this.queueBroadcastInterval) {
      clearInterval(this.queueBroadcastInterval);
    }

    // Broadcast queue updates every 5 seconds
    this.queueBroadcastInterval = setInterval(() => {
      this.broadcastQueueUpdate();
    }, 5000);
  }

  /**
   * Attempt to create matches from queued players
   */
  private attemptMatching(): void {
    if (this.queue.size === 0) {
      return; // No players in queue
    }

    const queuedPlayers = Array.from(this.queue.values());

    // Sort by queue time (first come, first served for now)
    queuedPlayers.sort((a, b) => a.queuedAt.getTime() - b.queuedAt.getTime());

    // First, try to fill existing rooms that have available slots
    const filledRooms = this.fillAvailableRooms(queuedPlayers);

    // Remove players who were added to existing rooms
    filledRooms.forEach(playerId => {
      this.queue.delete(playerId);
    });

    // Then, create new matches with remaining players
    const remainingPlayers = queuedPlayers.filter(
      p => !filledRooms.includes(p.userId)
    );
    if (remainingPlayers.length >= 2) {
      const matches = this.findMatches(remainingPlayers);
      matches.forEach(match => {
        this.createMatch(match);
      });
    }
  }

  /**
   * Try to fill existing rooms that have available slots
   */
  private fillAvailableRooms(queuedPlayers: QueuedPlayer[]): string[] {
    const filledPlayerIds: string[] = [];

    if (!this.socketManager) {
      return filledPlayerIds;
    }

    // Get all active game rooms from the SocketManager
    const gameRooms = this.socketManager.getActiveRooms();

    gameRooms.forEach(room => {
      if (room.hasAvailableSlots() && !room.isGameInProgress()) {
        // Try to add a player to this room
        const availablePlayer = queuedPlayers.find(
          p =>
            !filledPlayerIds.includes(p.userId) &&
            this.arePlayersCompatible([p])
        );

        if (availablePlayer) {
          const addResult = room.addPlayer(availablePlayer.socket);
          if (addResult.success) {
            filledPlayerIds.push(availablePlayer.userId);

            // Apply preferred character if provided
            if (availablePlayer.preferences?.preferredCharacter) {
              room.setPlayerCharacter(
                availablePlayer.userId,
                availablePlayer.preferences.preferredCharacter
              );
            }

            console.log(
              `Added player ${availablePlayer.username} to existing room ${room.getId()}`
            );
          }
        }
      }
    });

    return filledPlayerIds;
  }

  /**
   * Find compatible players for matches
   */
  private findMatches(players: QueuedPlayer[]): QueuedPlayer[][] {
    const matches: QueuedPlayer[][] = [];
    const usedPlayers = new Set<string>();

    let i = 0;
    while (i < players.length - 1) {
      const potentialMatch: QueuedPlayer[] = [];

      let j = i;
      while (j < Math.min(i + this.matchSize, players.length)) {
        const player = players[j];
        if (!usedPlayers.has(player.userId)) {
          potentialMatch.push(player);
          usedPlayers.add(player.userId);
        }
        j += 1;
      }

      // Only create match if we have enough players (2-4)
      if (potentialMatch.length >= 2) {
        // Check compatibility
        if (this.arePlayersCompatible(potentialMatch)) {
          matches.push(potentialMatch);
        } else {
          // Return players to available pool
          potentialMatch.forEach(p => usedPlayers.delete(p.userId));
        }
      } else {
        // Return players to available pool
        potentialMatch.forEach(p => usedPlayers.delete(p.userId));
      }

      i += this.matchSize;
    }

    return matches;
  }

  /**
   * Check if players are compatible for a match
   */
  private arePlayersCompatible(players: QueuedPlayer[]): boolean {
    // For now, all players are compatible
    // Future enhancements could include skill-based matching, latency checks, etc.

    // Basic check: ensure no duplicate userIds (should never happen, but safety first)
    const userIds = new Set(players.map(p => p.userId));
    if (userIds.size !== players.length) {
      return false;
    }

    // Check for stale connections
    const hasStaleConnection = players.some(player => !player.socket.connected);
    if (hasStaleConnection) {
      return false;
    }

    // Check wait time - if any player has been waiting too long, prioritize them
    const currentTime = Date.now();
    const hasLongWaitPlayer = players.some(player => {
      const waitTime = currentTime - player.queuedAt.getTime();
      return waitTime > this.maxWaitTime;
    });

    if (hasLongWaitPlayer) {
      return true;
    }

    return true;
  }

  /**
   * Create a match from compatible players
   */
  private createMatch(players: QueuedPlayer[]): void {
    // Remove players from queue
    players.forEach(player => {
      this.queue.delete(player.userId);
    });

    // Generate unique room ID
    const roomId = MatchmakingQueue.generateRoomId();

    // Derive initial game configuration. If the host supplied a preferred
    // stage in their matchmaking preferences we store it here so that the
    // lobby and GameRoom already know which arena to load.
    const hostPreferredStage = players[0]?.preferences?.preferredStage;

    const roomConfig: Partial<GameRoomConfig> = {
      maxPlayers: Math.max(players.length, 4), // Allow room to accept up to 4 players, but start with current count
      gameMode: 'versus',
      timeLimit: 180, // 3 minutes in seconds (matches game constants)
      stockCount: 3,
      stage: hostPreferredStage, // may be undefined – lobby can still change
    };

    // Create the game room
    if (!this.socketManager) {
      throw new Error('SocketManager not set in MatchmakingQueue');
    }
    const gameRoom = new GameRoom(roomId, this.socketManager, roomConfig);

    // Add players to the room
    const addedPlayers: QueuedPlayer[] = [];

    players.forEach(player => {
      const result = gameRoom.addPlayer(player.socket);
      if (result.success) {
        // Apply preferred character if provided
        if (player.preferences?.preferredCharacter) {
          gameRoom.setPlayerCharacter(
            player.userId,
            player.preferences.preferredCharacter
          );
        }
        addedPlayers.push(player);
      } else {
        console.error(
          `Failed to add player ${player.username} to room: ${result.error}`
        );
        // Re-queue failed players
        this.queue.set(player.userId, player);
      }
    });

    // Only proceed if all players were successfully added
    if (addedPlayers.length === players.length) {
      // Register room with external system (SocketManager)
      if (this.roomRegistrationCallback) {
        this.roomRegistrationCallback(roomId, gameRoom);
      }

      // Notify players that match was found
      const matchFoundEvent: MatchFoundEvent = {
        players: addedPlayers,
        room: gameRoom,
        estimatedStartTime: new Date(Date.now() + 10000), // 10 seconds to start
      };

      MatchmakingQueue.notifyMatchFound(matchFoundEvent);

      // Broadcast initial lobby state immediately after match creation
      setTimeout(() => {
        if (this.socketManager) {
          const targetRoom = (this.socketManager as any).getGameRoom(roomId);
          if (targetRoom) {
            (this.socketManager as any).broadcastLobbyState(targetRoom);
          }
        }
      }, 100); // Small delay to ensure socket rooms are properly joined

      // Broadcast updated queue count
      this.broadcastQueueUpdate();

      console.log(
        `Match created: Room ${roomId} with players: ${addedPlayers.map(p => p.username).join(', ')}`
      );
    } else {
      // Something went wrong, re-queue all players
      players.forEach(player => {
        this.queue.set(player.userId, player);
      });
      console.error('Failed to create match, players re-queued');
    }
  }

  /**
   * Notify players that a match was found
   */
  private static notifyMatchFound(matchEvent: MatchFoundEvent): void {
    matchEvent.players.forEach(player => {
      player.socket.emit('matchFound', {
        roomId: matchEvent.room.getId(),
        players: matchEvent.players.map(p => ({
          userId: p.userId,
          username: p.username,
        })),
        estimatedStartTime: matchEvent.estimatedStartTime,
        gameConfig: matchEvent.room.getConfig(),
      });
    });

    // No countdown - let players ready up in lobby
    // MatchmakingQueue.startMatchCountdown(matchEvent);
  }

  /**
   * Start countdown notifications for match preparation
   * Currently disabled - players ready up in lobby instead
   */
  /*
  private static startMatchCountdown(matchEvent: MatchFoundEvent): void {
    const countdownTimes = [5000, 3000, 1000]; // 5s, 3s, 1s before start

    countdownTimes.forEach(timeRemaining => {
      setTimeout(() => {
        const secondsRemaining = timeRemaining / 1000;
        matchEvent.players.forEach(player => {
          player.socket.emit('matchCountdown', {
            roomId: matchEvent.room.getId(),
            secondsRemaining,
            message: `Match starting in ${secondsRemaining} second${secondsRemaining !== 1 ? 's' : ''}...`,
          });
        });
      }, 10000 - timeRemaining); // 10 seconds total countdown
    });

    // Final "Match Starting!" notification
    setTimeout(() => {
      matchEvent.players.forEach(player => {
        player.socket.emit('matchStarting', {
          roomId: matchEvent.room.getId(),
          message: 'Match starting now!',
        });
      });
    }, 10000);
  }
  */

  /**
   * Send queue status update to a specific player
   */
  private sendQueueStatusUpdate(userId: string): void {
    const status = this.getPlayerQueueStatus(userId);
    const player = this.queue.get(userId);

    if (status && player) {
      player.socket.emit('queueStatusUpdate', status);
    }
  }

  /**
   * Broadcast queue update to all players in queue
   */
  private broadcastQueueUpdate(): void {
    const queuedPlayers = Array.from(this.queue.values());

    queuedPlayers.forEach(player => {
      this.sendQueueStatusUpdate(player.userId);

      // Check for long-waiting players and send priority notifications
      this.checkLongWaitingPlayer(player);
    });
  }

  /**
   * Check if player has been waiting too long and send priority notification
   */
  private checkLongWaitingPlayer(player: QueuedPlayer): void {
    const waitTime = Date.now() - player.queuedAt.getTime();
    const halfMaxWait = this.maxWaitTime / 2; // 30 seconds

    if (waitTime >= halfMaxWait && waitTime < this.maxWaitTime) {
      // Player has been waiting for 30+ seconds
      player.socket.emit('queuePriorityUpdate', {
        message:
          'You have priority in the next match due to extended wait time',
        waitTime,
        priorityLevel: 'medium',
      });
    } else if (waitTime >= this.maxWaitTime) {
      // Player has been waiting for 60+ seconds
      player.socket.emit('queuePriorityUpdate', {
        message:
          'High priority match - you will be matched immediately when possible',
        waitTime,
        priorityLevel: 'high',
      });
    }
  }

  /**
   * Send welcome notification to new player
   */
  private sendQueueWelcomeNotification(socket: AuthenticatedSocket): void {
    const queueSize = this.queue.size;
    let message: string;

    if (queueSize === 1) {
      message =
        'Welcome to matchmaking! You are the first player in queue. Need at least 1 more player to start...';
    } else if (queueSize < 2) {
      message = `Welcome to matchmaking! ${2 - queueSize} more player needed for a match.`;
    } else {
      message = 'Welcome to matchmaking! Match search in progress...';
    }

    socket.emit('queueWelcome', {
      message,
      queueSize,
      matchSize: this.matchSize,
      playersNeeded: Math.max(0, 2 - queueSize), // Need at least 2 players
    });
  }

  /**
   * Check if queue has reached a milestone and notify all players
   */
  private checkQueueMilestone(): void {
    const queueSize = this.queue.size;

    if (queueSize === 2) {
      // Enough players for first match
      this.broadcastMilestone({
        type: 'match_ready',
        message: 'Enough players for a match! Starting matchmaking...',
        queueSize,
      });
    } else if (queueSize >= 4 && queueSize % 2 === 0) {
      // Multiple matches worth of players
      const possibleMatches = Math.floor(queueSize / 2);
      this.broadcastMilestone({
        type: 'multiple_matches',
        message: `Queue growing! ${possibleMatches} matches possible with current players.`,
        queueSize,
        possibleMatches,
      });
    }
  }

  /**
   * Broadcast milestone notification to all players in queue
   */
  private broadcastMilestone(milestone: {
    type: string;
    message: string;
    queueSize: number;
    possibleMatches?: number;
  }): void {
    const queuedPlayers = Array.from(this.queue.values());

    queuedPlayers.forEach(player => {
      player.socket.emit('queueMilestone', milestone);
    });
  }

  /**
   * Calculate estimated wait time based on queue position and size
   */
  private calculateEstimatedWaitTime(position: number): number {
    // Simple estimation: assume a match is made every 30 seconds on average
    const avgMatchTime = 30000; // 30 seconds
    const matchesAhead = Math.floor((position - 1) / this.matchSize);
    return matchesAhead * avgMatchTime;
  }

  /**
   * Calculate estimated time for next match to be made
   */
  private calculateEstimatedMatchTime(): number {
    const queueSize = this.queue.size;
    if (queueSize < this.matchSize) {
      // Not enough players for a match, estimate based on join rate
      const playersNeeded = this.matchSize - queueSize;
      const avgJoinTime = 15000; // Assume new player joins every 15 seconds
      return playersNeeded * avgJoinTime;
    }

    // Enough players, next match should happen within next matching cycle
    return 2000; // Next matching cycle
  }

  /**
   * Generate a unique room ID
   */
  private static generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Clean up disconnected players from queue
   */
  public cleanupDisconnectedPlayers(): void {
    const playersToRemove: string[] = [];

    this.queue.forEach((player, userId) => {
      if (!player.socket.connected) {
        playersToRemove.push(userId);
      }
    });

    playersToRemove.forEach(userId => {
      this.removePlayer(userId);
    });

    if (playersToRemove.length > 0) {
      console.log(
        `Cleaned up ${playersToRemove.length} disconnected players from queue`
      );
    }
  }

  /**
   * Get queue statistics
   */
  public getQueueStats(): {
    totalPlayers: number;
    averageWaitTime: number;
    oldestPlayerWaitTime: number;
  } {
    const players = Array.from(this.queue.values());
    const currentTime = Date.now();

    if (players.length === 0) {
      return {
        totalPlayers: 0,
        averageWaitTime: 0,
        oldestPlayerWaitTime: 0,
      };
    }

    const waitTimes = players.map(p => currentTime - p.queuedAt.getTime());
    const averageWaitTime =
      waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length;
    const oldestPlayerWaitTime = Math.max(...waitTimes);

    return {
      totalPlayers: players.length,
      averageWaitTime,
      oldestPlayerWaitTime,
    };
  }
}
