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

  // Create Game Constants
  console.log('📝 Creating game constants...');
  
  const gameConstants = [
    // Physics Movement Constants
    {
      id: 'physics_gravity',
      category: 'physics',
      name: 'gravity',
      description: 'Gravity force applied to players',
      value: 800,
      dataType: 'number'
    },
    {
      id: 'physics_jump_velocity',
      category: 'physics',
      name: 'jump_velocity',
      description: 'Initial velocity for player jumps',
      value: -600,
      dataType: 'number'
    },
    {
      id: 'physics_double_jump_velocity',
      category: 'physics',
      name: 'double_jump_velocity',
      description: 'Velocity for double jump',
      value: -500,
      dataType: 'number'
    },
    {
      id: 'physics_move_speed',
      category: 'physics',
      name: 'move_speed',
      description: 'Base movement speed for players',
      value: 200,
      dataType: 'number'
    },
    {
      id: 'physics_max_velocity',
      category: 'physics',
      name: 'max_velocity',
      description: 'Maximum velocity limit for players',
      value: 800,
      dataType: 'number'
    },
    {
      id: 'physics_max_acceleration',
      category: 'physics',
      name: 'max_acceleration',
      description: 'Maximum acceleration for players',
      value: 1200,
      dataType: 'number'
    },
    {
      id: 'physics_friction',
      category: 'physics',
      name: 'friction',
      description: 'Ground friction coefficient',
      value: 0.9,
      dataType: 'number'
    },
    {
      id: 'physics_air_resistance',
      category: 'physics',
      name: 'air_resistance',
      description: 'Air resistance coefficient',
      value: 0.95,
      dataType: 'number'
    },
    {
      id: 'physics_bounce_factor',
      category: 'physics',
      name: 'bounce_factor',
      description: 'Bounce factor for collisions',
      value: 0.1,
      dataType: 'number'
    },
    {
      id: 'physics_walking_threshold',
      category: 'physics',
      name: 'walking_threshold',
      description: 'Velocity threshold for walking animation',
      value: 10,
      dataType: 'number'
    },
    {
      id: 'physics_double_jump_multiplier',
      category: 'physics',
      name: 'double_jump_multiplier',
      description: 'Multiplier for double jump velocity',
      value: 0.8,
      dataType: 'number'
    },
    {
      id: 'physics_bounds',
      category: 'physics',
      name: 'world_bounds',
      description: 'Game world boundaries',
      value: {
        min_x: -1000,
        max_x: 1000,
        min_y: -500,
        max_y: 600,
        death_zone_y: 800,
        width: 2000,
        height: 1100
      },
      dataType: 'object'
    },
    
    // Combat Constants
    {
      id: 'combat_attack_cooldown',
      category: 'combat',
      name: 'attack_cooldown',
      description: 'Minimum time between attacks (ms)',
      value: 400,
      dataType: 'number'
    },
    {
      id: 'combat_invulnerability',
      category: 'combat',
      name: 'invulnerability_duration',
      description: 'Invulnerability time after taking damage (ms)',
      value: 1000,
      dataType: 'number'
    },
    {
      id: 'combat_critical_invulnerability',
      category: 'combat',
      name: 'critical_invulnerability_duration',
      description: 'Invulnerability time after critical damage (ms)',
      value: 1500,
      dataType: 'number'
    },
    {
      id: 'combat_respawn_invulnerability',
      category: 'combat',
      name: 'respawn_invulnerability',
      description: 'Invulnerability time after respawn (ms)',
      value: 2000,
      dataType: 'number'
    },
    {
      id: 'combat_max_damage',
      category: 'combat',
      name: 'max_damage_per_hit',
      description: 'Maximum damage allowed per single hit',
      value: 50,
      dataType: 'number'
    },
    {
      id: 'combat_min_damage',
      category: 'combat',
      name: 'min_damage_per_hit',
      description: 'Minimum damage per hit',
      value: 1,
      dataType: 'number'
    },
    {
      id: 'combat_max_knockback',
      category: 'combat',
      name: 'max_knockback_velocity',
      description: 'Maximum knockback velocity from attacks',
      value: 1200,
      dataType: 'number'
    },
    {
      id: 'combat_fall_damage',
      category: 'combat',
      name: 'fall_damage',
      description: 'Damage taken from falling off stage',
      value: 25,
      dataType: 'number'
    },
    {
      id: 'combat_critical_multiplier',
      category: 'combat',
      name: 'critical_multiplier',
      description: 'Damage multiplier for critical hits',
      value: 1.5,
      dataType: 'number'
    },
    {
      id: 'combat_critical_chance',
      category: 'combat',
      name: 'critical_chance',
      description: 'Chance for critical hit (0.0-1.0)',
      value: 0.1,
      dataType: 'number'
    },
    {
      id: 'combat_attack_range',
      category: 'combat',
      name: 'attack_range',
      description: 'Default attack range in pixels',
      value: 150,
      dataType: 'number'
    },
    {
      id: 'combat_max_combo_time',
      category: 'combat',
      name: 'max_combo_time',
      description: 'Maximum time for combo chain (ms)',
      value: 2000,
      dataType: 'number'
    },
    {
      id: 'combat_flash_interval',
      category: 'combat',
      name: 'flash_interval',
      description: 'Flash interval during invulnerability (ms)',
      value: 200,
      dataType: 'number'
    },
    
    // Game Rules
    {
      id: 'game_max_stocks',
      category: 'game',
      name: 'max_stocks',
      description: 'Default number of lives per player',
      value: 3,
      dataType: 'number'
    },
    {
      id: 'game_match_time',
      category: 'game',
      name: 'match_time',
      description: 'Default match duration in milliseconds',
      value: 180000,
      dataType: 'number'
    },
    {
      id: 'game_respawn_time',
      category: 'game',
      name: 'respawn_time',
      description: 'Time before respawn after KO (ms)',
      value: 2000,
      dataType: 'number'
    },
    {
      id: 'game_max_players',
      category: 'game',
      name: 'max_players',
      description: 'Maximum players per match',
      value: 2,
      dataType: 'number'
    },
    
    // Character Stats - Dash (Fast Lightweight)
    {
      id: 'character_dash_stats',
      category: 'characters',
      name: 'dash',
      description: 'Stats for Dash character',
      value: {
        name: 'Dash',
        speed: 250,
        jumpVelocity: -650,
        health: 80,
        attackDamage: 15,
        weight: 0.8
      },
      dataType: 'object'
    },
    // Character Stats - Rex (Balanced Allrounder)
    {
      id: 'character_rex_stats',
      category: 'characters',
      name: 'rex',
      description: 'Stats for Rex character',
      value: {
        name: 'Rex',
        speed: 200,
        jumpVelocity: -600,
        health: 100,
        attackDamage: 20,
        weight: 1.0
      },
      dataType: 'object'
    },
    // Character Stats - Titan (Heavy Hitter)
    {
      id: 'character_titan_stats',
      category: 'characters',
      name: 'titan',
      description: 'Stats for Titan character',
      value: {
        name: 'Titan',
        speed: 150,
        jumpVelocity: -550,
        health: 120,
        attackDamage: 30,
        weight: 1.3
      },
      dataType: 'object'
    },
    
    // UI Constants
    {
      id: 'ui_colors',
      category: 'ui',
      name: 'colors',
      description: 'UI color scheme',
      value: {
        primary: '#3498db',
        secondary: '#2c3e50',
        success: '#27ae60',
        danger: '#e74c3c',
        warning: '#f39c12',
        text: '#ffffff',
        text_secondary: '#bdc3c7'
      },
      dataType: 'object'
    },
    {
      id: 'ui_fonts',
      category: 'ui',
      name: 'fonts',
      description: 'UI font families',
      value: {
        primary: 'Arial, sans-serif',
        secondary: 'monospace'
      },
      dataType: 'object'
    },
    
    // Networking Constants
    {
      id: 'network_position_sync_rate',
      category: 'network',
      name: 'position_sync_rate',
      description: 'Rate for position updates (ms)',
      value: 60,
      dataType: 'number'
    },
    {
      id: 'network_max_input_buffer',
      category: 'network',
      name: 'max_input_buffer_size',
      description: 'Maximum input buffer size',
      value: 60,
      dataType: 'number'
    },
    {
      id: 'network_interpolation_delay',
      category: 'network',
      name: 'interpolation_delay',
      description: 'Interpolation delay for remote players (ms)',
      value: 100,
      dataType: 'number'
    },
    {
      id: 'network_max_buffer_size',
      category: 'network',
      name: 'max_buffer_size',
      description: 'Maximum network buffer size',
      value: 10,
      dataType: 'number'
    },
    
    // Physics Validation Constants
    {
      id: 'validation_position_tolerance',
      category: 'validation',
      name: 'position_tolerance',
      description: 'Position validation tolerance',
      value: 50,
      dataType: 'number'
    },
    {
      id: 'validation_velocity_tolerance',
      category: 'validation',
      name: 'velocity_tolerance',
      description: 'Velocity validation tolerance',
      value: 100,
      dataType: 'number'
    },
    {
      id: 'validation_max_position_change',
      category: 'validation',
      name: 'max_position_change_per_ms',
      description: 'Maximum position change per millisecond',
      value: 1.0,
      dataType: 'number'
    },
    {
      id: 'validation_max_velocity_change',
      category: 'validation',
      name: 'max_velocity_change_per_ms',
      description: 'Maximum velocity change per millisecond',
      value: 2.0,
      dataType: 'number'
    },
    
    // Player Entity Constants
    {
      id: 'player_collision_box',
      category: 'player',
      name: 'collision_box',
      description: 'Player collision box dimensions',
      value: {
        width: 50,
        height: 70
      },
      dataType: 'object'
    },
    {
      id: 'player_display_size',
      category: 'player',
      name: 'display_size',
      description: 'Player display dimensions',
      value: {
        width: 60,
        height: 80
      },
      dataType: 'object'
    },
    {
      id: 'player_radius',
      category: 'player',
      name: 'radius',
      description: 'Player collision radius for simplified checks',
      value: 25,
      dataType: 'number'
    },
    
    // Animation Constants
    {
      id: 'animation_breathing_scale',
      category: 'animation',
      name: 'breathing_scale',
      description: 'Scale factors for breathing animation',
      value: {
        scaleY: 1.02,
        duration: 2000
      },
      dataType: 'object'
    },
    {
      id: 'animation_hit_effect',
      category: 'animation',
      name: 'hit_effect',
      description: 'Hit effect animation parameters',
      value: {
        scaleY: 1.05,
        duration: 300
      },
      dataType: 'object'
    },
    {
      id: 'animation_damage_effect',
      category: 'animation',
      name: 'damage_effect',
      description: 'Damage effect animation parameters',
      value: {
        scaleY: 1.15,
        duration: 200
      },
      dataType: 'object'
    },
    
    // Server Configuration
    {
      id: 'server_port',
      category: 'server',
      name: 'port',
      description: 'Backend server port',
      value: 3001,
      dataType: 'number'
    },
    {
      id: 'server_frontend_port',
      category: 'server',
      name: 'frontend_port',
      description: 'Frontend development server port',
      value: 3000,
      dataType: 'number'
    }
  ];

  for (const constant of gameConstants) {
    await prisma.gameConstants.upsert({
      where: { id: constant.id },
      update: constant,
      create: constant,
    });
    console.log(`✓ Created game constant: ${constant.name}`);
  }

  console.log('🎉 Database seed completed successfully!');
  console.log(`📊 Created ${characters.length} characters, ${stages.length} stages, and ${gameConstants.length} game constants`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });