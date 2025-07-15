import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Characters
  console.log('📝 Creating characters...');
  
  const characters = [
    {
      id: 'fighter',
      name: 'Fighter',
      description: 'A balanced brawler with solid attack and defense capabilities.',
      stats: {
        health: 100,
        speed: 80,
        attack: 85,
        defense: 75,
        jumpHeight: 90,
        weight: 85,
        specialMoves: ['Punch Combo', 'Power Slam', 'Counter Strike']
      },
      unlockRequirements: {
        level: 1,
        wins: 0,
        cost: 0
      }
    },
    {
      id: 'speedster',
      name: 'Speedster', 
      description: 'A quick and agile fighter who relies on speed over strength.',
      stats: {
        health: 80,
        speed: 100,
        attack: 70,
        defense: 60,
        jumpHeight: 100,
        weight: 65,
        specialMoves: ['Lightning Strike', 'Dash Attack', 'Speed Boost']
      },
      unlockRequirements: {
        level: 1,
        wins: 0,
        cost: 0
      }
    },
    {
      id: 'tank',
      name: 'Tank',
      description: 'A heavy hitter with high defense but slower movement.',
      stats: {
        health: 130,
        speed: 60,
        attack: 95,
        defense: 100,
        jumpHeight: 70,
        weight: 110,
        specialMoves: ['Ground Pound', 'Shield Bash', 'Heavy Strike']
      },
      unlockRequirements: {
        level: 1,
        wins: 0,
        cost: 0
      }
    },
    {
      id: 'ninja',
      name: 'Ninja',
      description: 'A stealthy fighter with unique mobility and surprise attacks.',
      stats: {
        health: 90,
        speed: 95,
        attack: 80,
        defense: 65,
        jumpHeight: 110,
        weight: 70,
        specialMoves: ['Shadow Strike', 'Teleport', 'Smoke Bomb']
      },
      unlockRequirements: {
        level: 5,
        wins: 10,
        cost: 500
      }
    }
  ];

  for (const character of characters) {
    await prisma.character.upsert({
      where: { id: character.id },
      update: character,
      create: character,
    });
    console.log(`✓ Created character: ${character.name}`);
  }

  // Create Stages
  console.log('📝 Creating stages...');
  
  const stages = [
    {
      id: 'training_ground',
      name: 'Training Ground',
      description: 'A simple stage perfect for learning the basics.',
      config: {
        width: 800,
        height: 600,
        platforms: [
          { x: 0, y: 550, width: 800, height: 50, type: 'main' },
          { x: 200, y: 400, width: 150, height: 20, type: 'platform' },
          { x: 450, y: 400, width: 150, height: 20, type: 'platform' },
          { x: 325, y: 250, width: 150, height: 20, type: 'platform' }
        ],
        boundaries: {
          left: -50,
          right: 850,
          top: -100,
          bottom: 700
        },
        hazards: [],
        background: 'training_bg'
      },
      unlockRequirements: {
        level: 1,
        wins: 0,
        cost: 0
      }
    },
    {
      id: 'city_rooftop',
      name: 'City Rooftop',
      description: 'Fight among the skyscrapers on this urban battlefield.',
      config: {
        width: 900,
        height: 600,
        platforms: [
          { x: 0, y: 550, width: 900, height: 50, type: 'main' },
          { x: 150, y: 450, width: 120, height: 20, type: 'platform' },
          { x: 350, y: 350, width: 200, height: 20, type: 'platform' },
          { x: 630, y: 450, width: 120, height: 20, type: 'platform' },
          { x: 425, y: 200, width: 100, height: 20, type: 'platform' }
        ],
        boundaries: {
          left: -50,
          right: 950,
          top: -100,
          bottom: 700
        },
        hazards: [],
        background: 'city_bg'
      },
      unlockRequirements: {
        level: 1,
        wins: 0,
        cost: 0
      }
    },
    {
      id: 'volcano_crater',
      name: 'Volcano Crater',
      description: 'A dangerous stage with lava hazards and moving platforms.',
      config: {
        width: 800,
        height: 600,
        platforms: [
          { x: 100, y: 550, width: 200, height: 50, type: 'main' },
          { x: 500, y: 550, width: 200, height: 50, type: 'main' },
          { x: 250, y: 400, width: 300, height: 20, type: 'moving', 
            movement: { type: 'horizontal', range: 100, speed: 2 } },
          { x: 375, y: 250, width: 150, height: 20, type: 'platform' }
        ],
        boundaries: {
          left: -50,
          right: 850,
          top: -100,
          bottom: 700
        },
        hazards: [
          { x: 300, y: 580, width: 200, height: 20, type: 'lava', damage: 15 }
        ],
        background: 'volcano_bg'
      },
      unlockRequirements: {
        level: 3,
        wins: 5,
        cost: 250
      }
    }
  ];

  for (const stage of stages) {
    await prisma.stage.upsert({
      where: { id: stage.id },
      update: stage,
      create: stage,
    });
    console.log(`✓ Created stage: ${stage.name}`);
  }

  console.log('🎉 Database seed completed successfully!');
  console.log(`📊 Created ${characters.length} characters and ${stages.length} stages`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });