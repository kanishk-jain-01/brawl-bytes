export interface PlayerInputData {
  type: string;
  inputType?: string;
  data?: Record<string, unknown>;
  sequence?: number;
  timestamp?: number;
  attackType?: string;
  direction?: number;
  facing?: 'left' | 'right';
}

export interface ProcessedPlayerInput {
  playerId: string;
  timestamp: number;
  inputType: string;
  data: Record<string, unknown>;
  sequence: number;
  attackType?: string;
  direction?: number;
  facing?: 'left' | 'right';
}

export interface SocketError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ServerResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: SocketError;
  timestamp: number;
}

export interface MatchmakingRequest {
  gameMode: string;
  characterId?: string;
  preferences?: {
    region?: string;
    skillRange?: 'any' | 'similar' | 'strict';
  };
}

export interface RoomJoinRequest {
  roomId: string;
  password?: string;
}

export interface GameStateUpdate {
  type: 'player_update' | 'game_state' | 'match_end' | 'error';
  data: Record<string, unknown>;
  timestamp: number;
  sequence?: number;
}
