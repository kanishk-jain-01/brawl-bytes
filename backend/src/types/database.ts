export interface DatabaseStats {
  health: number;
  speed: number;
  jumpPower: number;
  attackDamage: number;
  range: number;
}

export interface Character {
  id: string;
  name: string;
  stats: DatabaseStats;
  unlocked: boolean;
}

export interface Stage {
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

export interface MatchResult {
  winnerId: string;
  winnerUsername: string;
  loserId: string;
  loserUsername: string;
  matchDuration: number;
  endReason: 'knockout' | 'timeout' | 'forfeit' | 'disconnect';
}

export interface UserStats {
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  averageMatchDuration: number;
  favoriteCharacter?: string;
}

export interface PlayerStats {
  level: number;
  experiencePoints: number;
  coins: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winStreak: number;
  bestWinStreak: number;
  rating: number;
  rankTier: string;
}

export interface DetailedMatchResult {
  userId: string;
  won: boolean;
  placement: number;
  damageDealt: number;
  damageTaken: number;
  kills: number;
  deaths: number;
  experienceGained: number;
  coinsEarned: number;
  ratingChange: number;
}

export interface GameConstants {
  [category: string]: {
    [key: string]: number | string | boolean;
  };
}
