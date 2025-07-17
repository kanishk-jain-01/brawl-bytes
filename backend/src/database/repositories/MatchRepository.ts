import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateMatchData {
  matchType: string;
  stageId: string;
  maxPlayers: number;
}

export interface CreateMatchParticipantData {
  matchId: string;
  userId: string;
  characterId: string;
}

export interface MatchParticipantUpdate {
  placement?: number;
  damageDealt?: number;
  damageTaken?: number;
  kills?: number;
  deaths?: number;
  stocksRemaining?: number;
  ratingChange?: number;
  experienceGained?: number;
  coinsEarned?: number;
  leftAt?: Date;
}

export interface MatchWithParticipants {
  id: string;
  matchType: string;
  stageId: string;
  maxPlayers: number;
  status: string;
  startedAt: Date | null;
  endedAt: Date | null;
  durationSeconds: number | null;
  winnerId: string | null;
  matchData: any;
  createdAt: Date;
  participants: {
    matchId: string;
    userId: string;
    characterId: string;
    placement: number | null;
    damageDealt: number;
    damageTaken: number;
    kills: number;
    deaths: number;
    stocksRemaining: number;
    ratingChange: number;
    experienceGained: number;
    coinsEarned: number;
    joinedAt: Date;
    leftAt: Date | null;
    user: {
      id: string;
      username: string;
    };
  }[];
}

export class MatchRepository {
  static async createMatch(
    matchData: CreateMatchData
  ): Promise<MatchWithParticipants> {
    const match = await prisma.match.create({
      data: {
        matchType: matchData.matchType,
        stageId: matchData.stageId,
        maxPlayers: matchData.maxPlayers,
        status: 'waiting',
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    return match;
  }

  static async addParticipant(
    participantData: CreateMatchParticipantData
  ): Promise<void> {
    await prisma.matchParticipant.create({
      data: {
        matchId: participantData.matchId,
        userId: participantData.userId,
        characterId: participantData.characterId,
      },
    });
  }

  static async startMatch(matchId: string): Promise<void> {
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      },
    });
  }

  static async endMatch(
    matchId: string,
    winnerId: string | null,
    matchData?: any
  ): Promise<void> {
    const startedAt = await prisma.match.findUnique({
      where: { id: matchId },
      select: { startedAt: true },
    });

    const durationSeconds = startedAt?.startedAt
      ? Math.floor((Date.now() - startedAt.startedAt.getTime()) / 1000)
      : null;

    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'completed',
        endedAt: new Date(),
        winnerId,
        durationSeconds,
        matchData,
      },
    });
  }

  static async updateParticipant(
    matchId: string,
    userId: string,
    updates: MatchParticipantUpdate
  ): Promise<void> {
    await prisma.matchParticipant.update({
      where: {
        matchId_userId: {
          matchId,
          userId,
        },
      },
      data: updates,
    });
  }

  static async getMatch(
    matchId: string
  ): Promise<MatchWithParticipants | null> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    return match;
  }

  static async getActiveMatch(
    userId: string
  ): Promise<MatchWithParticipants | null> {
    const match = await prisma.match.findFirst({
      where: {
        status: {
          in: ['waiting', 'in_progress'],
        },
        participants: {
          some: {
            userId,
            leftAt: null,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    return match;
  }

  static async getPlayerMatchHistory(
    userId: string,
    limit: number = 10
  ): Promise<MatchWithParticipants[]> {
    const matches = await prisma.match.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
        status: 'completed',
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        endedAt: 'desc',
      },
      take: limit,
    });

    return matches;
  }

  static async cancelMatch(matchId: string): Promise<void> {
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'cancelled',
        endedAt: new Date(),
      },
    });
  }
}
