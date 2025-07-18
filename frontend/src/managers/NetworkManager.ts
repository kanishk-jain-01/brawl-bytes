import { SOCKET_EVENTS } from '@/types/Network';
import { DamageType } from '@/types';
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

    // Listen for player attack events
    socketManager.on(SOCKET_EVENTS.PLAYER_ATTACK, (data: any) => {
      this.handleRemotePlayerAttack(data);
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

    console.log('NetworkManager: Event listeners set up');
  }

  private handleRemotePlayerInput(data: {
    playerId: string;
    inputType: string;
    attackType?: string;
    direction?: number;
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
          `[REMOTE_ATTACK_INPUT] from=${data.playerId} type=${data.attackType} dir=${data.direction}`
        );
        if (data.attackType && data.direction !== undefined) {
          remotePlayer.applyRemoteAttack(data.attackType, data.direction);
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
  }): void {
    // Debug: remote player movement received
    console.log(
      `[REMOTE_MOVE] from=${data.playerId} pos=(${data.position.x.toFixed(1)},${data.position.y.toFixed(1)})`
    );
    const remotePlayer = this.remotePlayers.get(data.playerId);
    if (!remotePlayer) return;

    remotePlayer.applyRemotePosition(data.position, data.velocity);
  }

  private handleRemotePlayerAttack(data: {
    playerId: string;
    attackType: string;
    direction: number;
    hitbox?: any;
  }): void {
    // Debug: remote player attack received
    console.log(
      `[REMOTE_ATTACK] from=${data.playerId} type=${data.attackType} dir=${data.direction}`
    );

    const remotePlayer = this.remotePlayers.get(data.playerId);
    if (!remotePlayer) return;

    remotePlayer.applyRemoteAttack(data.attackType, data.direction);
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

  public createRemotePlayer(
    playerId: string,
    username: string,
    spawnPoint: { x: number; y: number }
  ): Player {
    const remotePlayer = new Player({
      scene: this.scene,
      x: spawnPoint.x,
      y: spawnPoint.y,
      characterType: 'BALANCED_ALLROUNDER', // Default, will be updated by character selection sync
      playerId,
      isLocalPlayer: false,
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
  }): void {
    const targetPlayer = this.remotePlayers.get(data.targetPlayerId);
    if (!targetPlayer) return;

    // Apply damage and knockback effects
    targetPlayer.takeDamage({
      amount: data.damage,
      type: DamageType.PHYSICAL,
      source: 'remote_player',
    });
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
      socketManager.off(SOCKET_EVENTS.PLAYER_ATTACK);
      socketManager.off(SOCKET_EVENTS.PLAYER_JOINED);
      socketManager.off(SOCKET_EVENTS.PLAYER_LEFT);
      socketManager.off(SOCKET_EVENTS.GAME_EVENT);
      socketManager.off(SOCKET_EVENTS.SERVER_STATE);
      socketManager.off(SOCKET_EVENTS.POSITION_CORRECTION);
      socketManager.off(SOCKET_EVENTS.GAME_PAUSED);
      socketManager.off(SOCKET_EVENTS.GAME_RESUMED);
      socketManager.off(SOCKET_EVENTS.PLAYER_DISCONNECTED);
      socketManager.off(SOCKET_EVENTS.PLAYER_RECONNECTED);
    }
  }
}
