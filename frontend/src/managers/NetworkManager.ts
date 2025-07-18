import { SOCKET_EVENTS } from '@/types/Network';
import { DamageType } from '@/types';
import type { DamageInfo, MatchTimerUpdate } from '@/types';
import { getSocketManager } from '@/managers/SocketManager';
import { Player } from '../entities/Player';

export interface NetworkEventHandlers {
  onPlayerJoined: (data: { playerId: string; username: string }) => void;
  onPlayerLeft: (data: { playerId: string }) => void;
  onPlayerQuit: (data: {
    playerId: string;
    username: string;
    remainingPlayers: number;
  }) => void;
  onMatchEnd: (data: {
    winnerId?: string;
    winnerUsername?: string;
    endReason: string;
    matchDuration: number;
  }) => void;
  onGameEvent: (data: any) => void;
  onMatchTimerUpdate: (data: MatchTimerUpdate) => void;
  onGamePaused: (data: {
    reason: string;
    disconnectedPlayer?: { userId: string; username: string };
    pausedAt: string;
  }) => void;
  onGameResumed: (data: { reason: string; resumedAt: string }) => void;
  onPlayerDisconnected: (data: {
    playerId: string;
    username: string;
    gracePeriod: number;
    gameState: string;
  }) => void;
  onPlayerReconnected: (data: {
    playerId: string;
    username: string;
    disconnectionDuration: number;
    gameState: string;
  }) => void;
}

export class NetworkManager {
  private scene: Phaser.Scene;

  private remotePlayers: Map<string, Player> = new Map();

  private handlers: NetworkEventHandlers;

  constructor(scene: Phaser.Scene, handlers: NetworkEventHandlers) {
    this.scene = scene;
    this.handlers = handlers;
    this.setupNetworking();
  }

  private setupNetworking(): void {
    const socketManager = getSocketManager();
    if (!socketManager) return;

    // Listen for player input events from other players
    socketManager.on(SOCKET_EVENTS.PLAYER_INPUT, (data: any) => {
      this.handleRemotePlayerInput(data);
    });

    // Listen for player move events
    socketManager.on(SOCKET_EVENTS.PLAYER_MOVE, (data: any) => {
      this.handleRemotePlayerMove(data);
    });

    // Listen for player update events (health, stocks, etc.)
    socketManager.on(SOCKET_EVENTS.PLAYER_UPDATE, (data: any) => {
      this.handleRemotePlayerUpdate(data);
    });

    // Listen for players joining the game
    socketManager.on(SOCKET_EVENTS.PLAYER_JOINED, (data: any) => {
      this.handlers.onPlayerJoined(data);
    });

    // Listen for players leaving the game
    socketManager.on(SOCKET_EVENTS.PLAYER_LEFT, (data: any) => {
      this.handlers.onPlayerLeft(data);
    });

    // Listen for game events
    socketManager.on(SOCKET_EVENTS.GAME_EVENT, (data: any) => {
      this.handlers.onGameEvent(data);
    });

    // Listen for server state updates (for prediction reconciliation)
    socketManager.on(SOCKET_EVENTS.SERVER_STATE, (data: any) => {
      this.handleServerState(data);
    });

    // Listen for position corrections
    socketManager.on(SOCKET_EVENTS.POSITION_CORRECTION, (data: any) => {
      this.handlePositionCorrection(data);
    });

    // Listen for game pause/resume events
    socketManager.on(SOCKET_EVENTS.GAME_PAUSED, (data: any) => {
      this.handlers.onGamePaused(data);
    });

    socketManager.on(SOCKET_EVENTS.GAME_RESUMED, (data: any) => {
      this.handlers.onGameResumed(data);
    });

    // Listen for player disconnect/reconnect events
    socketManager.on(SOCKET_EVENTS.PLAYER_DISCONNECTED, (data: any) => {
      this.handlers.onPlayerDisconnected(data);
    });

    socketManager.on(SOCKET_EVENTS.PLAYER_RECONNECTED, (data: any) => {
      this.handlers.onPlayerReconnected(data);
    });

    // Listen for quit-related events
    socketManager.on('playerQuit', (data: any) => {
      this.handlers.onPlayerQuit(data);
    });

    socketManager.on(SOCKET_EVENTS.MATCH_END, (data: any) => {
      this.handlers.onMatchEnd(data);
    });

    socketManager.on(SOCKET_EVENTS.PLAYER_QUIT_SUCCESS, (data: any) => {
      console.log('Player quit successful:', data);
    });

    // Listen for initial player positions from server
    socketManager.on('initialPlayerPositions', (data: any) => {
      this.handleInitialPlayerPositions(data);
    });

    // Listen for match timer updates
    socketManager.on(SOCKET_EVENTS.MATCH_TIMER_UPDATE, (data: any) => {
      this.handlers.onMatchTimerUpdate(data);
    });

    console.log('NetworkManager: Event listeners set up');
  }

  private handleRemotePlayerInput(data: {
    playerId: string;
    inputType: string;
    attackType?: string;
    direction?: number;
    facing?: 'left' | 'right';
    data?: any;
  }): void {
    const remotePlayer = this.remotePlayers.get(data.playerId);
    if (!remotePlayer) return;

    switch (data.inputType) {
      case 'jump':
        remotePlayer.applyRemoteAction('jump');
        break;
      case 'special':
        remotePlayer.applyRemoteAction('special');
        break;
      case 'attack':
        // Debug: remote player attack received via modern system
        console.log(
          `[REMOTE_ATTACK_INPUT] from=${data.playerId} type=${data.attackType} dir=${data.direction} facing=${data.facing}`
        );
        if (data.attackType && data.direction !== undefined) {
          remotePlayer.applyRemoteAttack(
            data.attackType,
            data.direction,
            data.facing
          );
        }
        break;
      default:
        // Unknown input type, ignore
        break;
    }
  }

  private handleRemotePlayerMove(data: {
    playerId: string;
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    facing?: 'left' | 'right';
    sequence?: number;
    timestamp: number;
  }): void {
    const remotePlayer = this.remotePlayers.get(data.playerId);
    if (!remotePlayer) return;

    // Debug: remote player movement received
    console.log(
      `[REMOTE_MOVE] player=${data.playerId} pos=(${data.position.x.toFixed(
        1
      )}, ${data.position.y.toFixed(1)}) facing=${data.facing} seq=${
        data.sequence ?? 0
      }`
    );

    remotePlayer.applyRemotePosition(data.position, data.velocity, data.facing);
  }

  private handleRemotePlayerUpdate(data: {
    playerId: string;
    update: {
      position: { x: number; y: number };
      velocity: { x: number; y: number };
      animation: string;
      health: number;
      stocks: number;
      isInvulnerable: boolean;
    };
    timestamp: number;
  }): void {
    const remotePlayer = this.remotePlayers.get(data.playerId);
    if (!remotePlayer) return;

    // Debug: remote player update received
    console.log(
      `[REMOTE_UPDATE] player=${data.playerId} health=${data.update.health} stocks=${data.update.stocks}`
    );

    // Apply position and movement updates
    remotePlayer.applyRemotePosition(
      data.update.position,
      data.update.velocity
    );

    // Apply health and stock updates
    remotePlayer.applyRemoteHealthUpdate({
      health: data.update.health,
      stocks: data.update.stocks,
      isInvulnerable: data.update.isInvulnerable,
    });
  }

  private handleServerState(data: {
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    sequence: number;
    timestamp: number;
  }): void {
    // This would typically be handled by the local player
    // For now, we'll emit an event that the GameScene can listen to
    this.scene.events.emit('serverState', data);
  }

  private handlePositionCorrection(data: {
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    sequence: number;
    timestamp: number;
  }): void {
    // This would typically be handled by the local player
    // For now, we'll emit an event that the GameScene can listen to
    this.scene.events.emit('positionCorrection', data);
    console.warn('Position corrected by server');
  }

  private handleInitialPlayerPositions(data: {
    players: Array<{
      playerId: string;
      position: { x: number; y: number };
      velocity: { x: number; y: number };
      facing?: 'left' | 'right';
    }>;
    timestamp: number;
  }): void {
    console.log(
      'NetworkManager: Received initial player positions from server:',
      data
    );

    // Apply initial positions to remote players
    data.players.forEach(playerData => {
      const remotePlayer = this.remotePlayers.get(playerData.playerId);
      if (remotePlayer) {
        console.log(
          `NetworkManager: Setting initial position for ${playerData.playerId}: (${playerData.position.x}, ${playerData.position.y}) facing=${playerData.facing}`
        );
        remotePlayer.applyRemotePosition(
          playerData.position,
          playerData.velocity,
          playerData.facing
        );
      }
    });
  }

  public createRemotePlayer(
    playerId: string,
    username: string,
    spawnPoint: { x: number; y: number }
  ): Player {
    const remotePlayer = new Player({
      scene: this.scene,
      x: spawnPoint.x,
      y: spawnPoint.y,
      characterType: 'REX', // Default, will be updated by character selection sync
      playerId,
      isLocalPlayer: false,
      username,
    });

    this.remotePlayers.set(playerId, remotePlayer);
    console.log(`Created remote player: ${username} (${playerId})`);

    return remotePlayer;
  }

  public createRemotePlayerWithCharacter(
    playerId: string,
    username: string,
    spawnPoint: { x: number; y: number },
    characterType: string
  ): Player {
    const remotePlayer = new Player({
      scene: this.scene,
      x: spawnPoint.x,
      y: spawnPoint.y,
      characterType: characterType as any,
      playerId,
      isLocalPlayer: false,
      username,
    });

    this.remotePlayers.set(playerId, remotePlayer);
    console.log(
      `Created remote player: ${username} (${playerId}) with character ${characterType}`
    );

    return remotePlayer;
  }

  public removeRemotePlayer(playerId: string): Player | null {
    const remotePlayer = this.remotePlayers.get(playerId);
    if (remotePlayer) {
      remotePlayer.destroy();
      this.remotePlayers.delete(playerId);
      return remotePlayer;
    }
    return null;
  }

  public handleRemotePlayerHit(data: {
    targetPlayerId: string;
    damage: number;
    knockback: any;
    damageType?: string;
    isCritical?: boolean;
  }): void {
    const targetPlayer = this.remotePlayers.get(data.targetPlayerId);
    if (!targetPlayer) return;

    // Create damage info for visual effects
    const damageInfo: DamageInfo = {
      amount: data.damage,
      type: (data.damageType as DamageType) || DamageType.PHYSICAL,
      knockback: data.knockback,
      isCritical: data.isCritical || false,
      source: 'remote_player',
    };

    // Apply visual hit effect (flutter animation + tint)
    targetPlayer.applyVisibleHitEffect(damageInfo);

    // Apply damage and knockback effects
    targetPlayer.takeDamage(damageInfo);
  }

  public handleRemotePlayerKO(data: { targetPlayerId: string }): void {
    const targetPlayer = this.remotePlayers.get(data.targetPlayerId);
    if (!targetPlayer) return;

    // Handle KO effects
    targetPlayer.respawn();
  }

  public setPlayerDisconnectedState(
    playerId: string,
    disconnected: boolean
  ): void {
    const player = this.remotePlayers.get(playerId);
    if (!player) return;

    if (disconnected) {
      // Make player semi-transparent and add disconnected indicator
      player.setAlpha(0.5);
      player.setTint(0x666666);
    } else {
      // Restore normal appearance
      player.setAlpha(1);
      player.clearTint();
    }
  }

  public getRemotePlayer(playerId: string): Player | undefined {
    return this.remotePlayers.get(playerId);
  }

  public getAllRemotePlayers(): Player[] {
    return Array.from(this.remotePlayers.values());
  }

  public hasRemotePlayer(playerId: string): boolean {
    return this.remotePlayers.has(playerId);
  }

  public destroy(): void {
    // Clean up all remote players
    this.remotePlayers.forEach(player => {
      player.destroy();
    });
    this.remotePlayers.clear();

    // Remove event listeners
    const socketManager = getSocketManager();
    if (socketManager) {
      socketManager.off(SOCKET_EVENTS.PLAYER_INPUT);
      socketManager.off(SOCKET_EVENTS.PLAYER_MOVE);
      socketManager.off(SOCKET_EVENTS.PLAYER_JOINED);
      socketManager.off(SOCKET_EVENTS.PLAYER_LEFT);
      socketManager.off(SOCKET_EVENTS.GAME_EVENT);
      socketManager.off(SOCKET_EVENTS.SERVER_STATE);
      socketManager.off(SOCKET_EVENTS.POSITION_CORRECTION);
      socketManager.off(SOCKET_EVENTS.GAME_PAUSED);
      socketManager.off(SOCKET_EVENTS.GAME_RESUMED);
      socketManager.off(SOCKET_EVENTS.PLAYER_DISCONNECTED);
      socketManager.off(SOCKET_EVENTS.PLAYER_RECONNECTED);
      socketManager.off('initialPlayerPositions');
      socketManager.off(SOCKET_EVENTS.MATCH_TIMER_UPDATE);
    }
  }
}
