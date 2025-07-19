// Backend-specific database entity types (avoid conflicts with shared types)

export interface DatabaseCharacterStats {
  health: number;
  speed: number;
  jumpPower: number;
  attackDamage: number;
  range: number;
}

export interface DatabaseCharacter {
  id: string;
  name: string;
  stats: DatabaseCharacterStats;
  unlocked: boolean;
}

export interface DatabaseStage {
  id: string;
  name: string;
  spawns: Array<{ x: number; y: number }>;
  platforms: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export interface DatabaseMatchResult {
  winnerId: string;
  winnerUsername: string;
  loserId: string;
  loserUsername: string;
  matchDuration: number;
  endReason: 'knockout' | 'timeout' | 'forfeit' | 'disconnect';
}

export interface DatabaseUserStats {
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  averageMatchDuration: number;
  favoriteCharacter?: string;
}

export interface DatabaseGameConstants {
  [category: string]: {
    [key: string]: number | string | boolean;
  };
}

// Removed backward compatibility alias - use DatabaseCharacterStats directly
