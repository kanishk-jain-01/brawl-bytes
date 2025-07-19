import { PrismaClient, Prisma } from '@prisma/client';
import type { DetailedMatchResult, DatabasePlayerStats } from '../types';

type PlayerProfile = Prisma.PlayerProfileGetPayload<Record<string, never>>;

const prisma = new PrismaClient();

export class PlayerStatsService {
  static async updatePlayerStats(
    matchResults: DetailedMatchResult[]
  ): Promise<void> {
    await Promise.all(
      matchResults.map(result => this.updateSinglePlayerStats(result))
    );
  }

  private static async updateSinglePlayerStats(
    result: DetailedMatchResult
  ): Promise<void> {
    const currentProfile = await prisma.playerProfile.findUnique({
      where: { userId: result.userId },
    });

    if (!currentProfile) {
      throw new Error(`Player profile not found for user ${result.userId}`);
    }

    const newWinStreak = result.won ? currentProfile.winStreak + 1 : 0;
    const newBestWinStreak = Math.max(
      newWinStreak,
      currentProfile.bestWinStreak
    );
    const newExperience =
      currentProfile.experiencePoints + result.experienceGained;
    const newLevel = this.calculateLevel(newExperience);
    const newRating = Math.max(
      0,
      Math.floor(currentProfile.rating + result.ratingChange)
    );
    const newRankTier = this.calculateRankTier(newRating);

    await prisma.playerProfile.update({
      where: { userId: result.userId },
      data: {
        level: newLevel,
        experiencePoints: newExperience,
        coins: currentProfile.coins + result.coinsEarned,
        totalMatches: currentProfile.totalMatches + 1,
        wins: result.won ? currentProfile.wins + 1 : currentProfile.wins,
        losses: result.won ? currentProfile.losses : currentProfile.losses + 1,
        winStreak: newWinStreak,
        bestWinStreak: newBestWinStreak,
        rating: newRating,
        rankTier: newRankTier,
        updatedAt: new Date(),
      },
    });
  }

  static calculateExperienceGained(
    placement: number,
    totalPlayers: number,
    matchDurationSeconds: number
  ): number {
    const baseExp = 50;
    const placementMultiplier = (totalPlayers - placement + 1) / totalPlayers;
    const durationBonus = Math.min(matchDurationSeconds / 60, 10) * 2; // Max 20 bonus for 10+ min matches

    return Math.floor(baseExp * placementMultiplier + durationBonus);
  }

  static calculateCoinsEarned(
    placement: number,
    totalPlayers: number,
    experienceGained: number
  ): number {
    const baseCoins = 25;
    const placementMultiplier = (totalPlayers - placement + 1) / totalPlayers;
    const expBonus = Math.floor(experienceGained * 0.5);

    return Math.floor(baseCoins * placementMultiplier) + expBonus;
  }

  static calculateRatingChange(
    playerRating: number,
    opponentAverageRating: number,
    placement: number,
    totalPlayers: number
  ): number {
    const K = 32; // ELO K-factor
    const expectedScore = this.calculateExpectedScore(
      playerRating,
      opponentAverageRating
    );

    // Convert placement to score (1st = 1.0, 2nd = 0.7, 3rd = 0.4, 4th = 0.0)
    // Handle edge case when there's only 1 player
    const actualScore =
      totalPlayers === 1
        ? 1.0 // Single player always gets max score
        : Math.max(0, (totalPlayers - placement) / (totalPlayers - 1));

    const ratingChange = Math.round(K * (actualScore - expectedScore));
    // Ensure the result is a valid number
    return Number.isNaN(ratingChange) ? 0 : ratingChange;
  }

  private static calculateExpectedScore(
    playerRating: number,
    opponentRating: number
  ): number {
    // Ensure valid inputs
    if (Number.isNaN(playerRating) || Number.isNaN(opponentRating)) {
      return 0.5; // Default to 50% expected score if ratings are invalid
    }

    const expectedScore =
      1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
    return Number.isNaN(expectedScore) ? 0.5 : expectedScore;
  }

  private static calculateLevel(experiencePoints: number): number {
    // Level formula: level = floor(sqrt(exp / 100)) + 1
    return Math.floor(Math.sqrt(experiencePoints / 100)) + 1;
  }

  private static calculateRankTier(rating: number): string {
    if (rating >= 2000) return 'Master';
    if (rating >= 1700) return 'Diamond';
    if (rating >= 1400) return 'Platinum';
    if (rating >= 1100) return 'Gold';
    if (rating >= 800) return 'Silver';
    return 'Bronze';
  }

  static async getPlayerStats(
    userId: string
  ): Promise<DatabasePlayerStats | null> {
    const profile = await prisma.playerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return null;
    }

    return {
      level: profile.level,
      experiencePoints: profile.experiencePoints,
      coins: profile.coins,
      totalMatches: profile.totalMatches,
      wins: profile.wins,
      losses: profile.losses,
      winStreak: profile.winStreak,
      bestWinStreak: profile.bestWinStreak,
      rating: profile.rating,
      rankTier: profile.rankTier,
    };
  }

  static async processMatchCompletion(
    _matchId: string,
    winnerId: string | null,
    participants: Array<{
      userId: string;
      placement: number;
      damageDealt: number;
      damageTaken: number;
      kills: number;
      deaths: number;
    }>,
    matchDurationSeconds: number
  ): Promise<DetailedMatchResult[]> {
    const totalPlayers = participants.length;
    const results: DetailedMatchResult[] = [];

    // Calculate average rating for ELO calculations
    const playerProfiles = await prisma.playerProfile.findMany({
      where: {
        userId: {
          in: participants.map(p => p.userId),
        },
      },
    });

    const averageRating =
      playerProfiles.reduce(
        (sum: number, profile: PlayerProfile) => sum + profile.rating,
        0
      ) / playerProfiles.length;

    const processedResults = participants
      .map(participant => {
        const playerProfile = playerProfiles.find(
          (p: PlayerProfile) => p.userId === participant.userId
        );
        if (!playerProfile) return null;

        const won = participant.userId === winnerId;
        const experienceGained = this.calculateExperienceGained(
          participant.placement,
          totalPlayers,
          matchDurationSeconds
        );
        const coinsEarned = this.calculateCoinsEarned(
          participant.placement,
          totalPlayers,
          experienceGained
        );
        const ratingChange = this.calculateRatingChange(
          playerProfile.rating,
          averageRating,
          participant.placement,
          totalPlayers
        );

        return {
          userId: participant.userId,
          won,
          placement: participant.placement,
          damageDealt: participant.damageDealt,
          damageTaken: participant.damageTaken,
          kills: participant.kills,
          deaths: participant.deaths,
          experienceGained,
          coinsEarned,
          ratingChange,
        };
      })
      .filter((result): result is DetailedMatchResult => result !== null);

    results.push(...processedResults);

    await this.updatePlayerStats(results);
    return results;
  }
}
