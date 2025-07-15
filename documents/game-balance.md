# Game Balance & Character Design

## Overview

Game balance is crucial for competitive multiplayer fighting games. This document defines the core mechanics, character statistics, damage values, and frame data that ensure fair and engaging gameplay in Brawl Bytes.

## Core Game Mechanics

### Health & Stock System

```typescript
interface HealthSystem {
  maxHealth: 100;
  stockCount: 3; // Lives per player
  respawnInvincibility: 2000; // 2 seconds in milliseconds
  fallOffStageThreshold: -500; // Y position below stage
}

// Health regeneration (optional mechanic)
interface HealthRegen {
  enabled: false; // Disabled for competitive balance
  regenRate: 0; // HP per second
  regenDelay: 5000; // Delay after taking damage
}
```

### Knockback System

```typescript
interface KnockbackCalculation {
  // Base knockback formula: damage * damageMultiplier + baseKnockback
  baseDamage: number;
  damageMultiplier: 1.2;
  baseKnockback: 50;
  
  // Knockback scaling with health
  healthScaling: boolean; // true = more knockback at higher damage
  scalingFactor: 0.01; // Multiplier per health point lost
  
  // Directional influence
  maxDI: 0.3; // Maximum directional influence (30%)
  diDecay: 0.95; // DI effectiveness decay per frame
}
```

### Movement Physics

```typescript
interface MovementPhysics {
  // Universal physics constants
  gravity: 0.8;
  airFriction: 0.98;
  groundFriction: 0.85;
  
  // Jump mechanics
  jumpBufferTime: 8; // frames
  coyoteTime: 6; // frames after leaving ground
  
  // Ledge mechanics
  ledgeGrabRange: 30; // pixels
  ledgeInvincibility: 30; // frames
  maxLedgeGrabs: 3; // Before forced drop
}
```

## Character Statistics

### Base Character Template

```typescript
interface CharacterStats {
  // Movement
  walkSpeed: number;      // Ground movement speed
  runSpeed: number;       // Maximum ground speed
  airSpeed: number;       // Air movement speed
  jumpHeight: number;     // First jump height
  doubleJumpHeight: number; // Second jump height
  
  // Physics
  weight: number;         // Affects knockback resistance
  fallSpeed: number;      // Falling acceleration
  fastFallSpeed: number;  // Fast fall speed
  
  // Combat
  attackPower: number;    // Base damage multiplier
  attackSpeed: number;    // Animation speed multiplier
  range: number;          // Attack reach modifier
  
  // Defense
  shield: number;         // Shield strength
  dodgeSpeed: number;     // Roll/dodge speed
  
  // Special
  specialMeter: number;   // Special move resource
  uniqueAbility: string;  // Character-specific mechanic
}
```

### Character Roster

#### 1. Warrior (Balanced All-Rounder)
```typescript
const warrior: CharacterStats = {
  // Movement - Balanced
  walkSpeed: 3.5,
  runSpeed: 7.0,
  airSpeed: 5.0,
  jumpHeight: 120,
  doubleJumpHeight: 100,
  
  // Physics - Medium weight
  weight: 100,
  fallSpeed: 1.5,
  fastFallSpeed: 2.5,
  
  // Combat - Balanced
  attackPower: 1.0,
  attackSpeed: 1.0,
  range: 1.0,
  
  // Defense - Standard
  shield: 100,
  dodgeSpeed: 8.0,
  
  // Special
  specialMeter: 100,
  uniqueAbility: "Weapon_Combo_Chain"
};
```

#### 2. Assassin (Fast & Fragile)
```typescript
const assassin: CharacterStats = {
  // Movement - High speed
  walkSpeed: 4.5,
  runSpeed: 9.0,
  airSpeed: 7.0,
  jumpHeight: 140,
  doubleJumpHeight: 120,
  
  // Physics - Light weight
  weight: 75,
  fallSpeed: 1.2,
  fastFallSpeed: 2.0,
  
  // Combat - Fast but weak
  attackPower: 0.8,
  attackSpeed: 1.3,
  range: 0.8,
  
  // Defense - Weak defense
  shield: 75,
  dodgeSpeed: 12.0,
  
  // Special
  specialMeter: 80,
  uniqueAbility: "Shadow_Dash"
};
```

#### 3. Tank (Slow & Strong)
```typescript
const tank: CharacterStats = {
  // Movement - Low speed
  walkSpeed: 2.5,
  runSpeed: 5.0,
  airSpeed: 3.5,
  jumpHeight: 90,
  doubleJumpHeight: 70,
  
  // Physics - Heavy weight
  weight: 130,
  fallSpeed: 2.0,
  fastFallSpeed: 3.2,
  
  // Combat - Strong but slow
  attackPower: 1.4,
  attackSpeed: 0.7,
  range: 1.2,
  
  // Defense - High defense
  shield: 150,
  dodgeSpeed: 5.0,
  
  // Special
  specialMeter: 120,
  uniqueAbility: "Armor_Mode"
};
```

#### 4. Mage (Ranged Specialist)
```typescript
const mage: CharacterStats = {
  // Movement - Moderate speed
  walkSpeed: 3.0,
  runSpeed: 6.0,
  airSpeed: 4.5,
  jumpHeight: 110,
  doubleJumpHeight: 110,
  
  // Physics - Light-medium weight
  weight: 85,
  fallSpeed: 1.3,
  fastFallSpeed: 2.2,
  
  // Combat - Ranged focus
  attackPower: 1.1,
  attackSpeed: 0.9,
  range: 1.5,
  
  // Defense - Moderate
  shield: 90,
  dodgeSpeed: 7.0,
  
  // Special
  specialMeter: 150,
  uniqueAbility: "Spell_Charging"
};
```

#### 5. Speedster (Ultra-Fast Glass Cannon)
```typescript
const speedster: CharacterStats = {
  // Movement - Maximum speed
  walkSpeed: 5.0,
  runSpeed: 11.0,
  airSpeed: 8.0,
  jumpHeight: 160,
  doubleJumpHeight: 140,
  
  // Physics - Very light
  weight: 60,
  fallSpeed: 1.0,
  fastFallSpeed: 1.8,
  
  // Combat - Fast but fragile
  attackPower: 0.7,
  attackSpeed: 1.5,
  range: 0.7,
  
  // Defense - Minimal
  shield: 60,
  dodgeSpeed: 15.0,
  
  // Special
  specialMeter: 60,
  uniqueAbility: "Time_Slow"
};
```

## Attack Frame Data

### Attack Types

```typescript
interface AttackFrameData {
  startup: number;    // Frames before hitbox becomes active
  active: number;     // Frames hitbox is active
  recovery: number;   // Frames after hitbox ends
  totalFrames: number; // Total animation length
  
  damage: number;     // Base damage
  knockback: number;  // Base knockback
  angle: number;      // Launch angle in degrees
  
  hitboxSize: Vector2; // Width/height of hitbox
  hitboxOffset: Vector2; // Offset from character center
  
  canCancel: boolean; // Can be cancelled into other moves
  priority: number;   // Clash priority (1-10)
}
```

### Universal Attack Data

#### Light Attack (Jab)
```typescript
const lightAttack: AttackFrameData = {
  startup: 3,
  active: 2,
  recovery: 8,
  totalFrames: 13,
  
  damage: 8,
  knockback: 30,
  angle: 45,
  
  hitboxSize: { x: 60, y: 40 },
  hitboxOffset: { x: 40, y: 0 },
  
  canCancel: true,
  priority: 3
};
```

#### Heavy Attack
```typescript
const heavyAttack: AttackFrameData = {
  startup: 12,
  active: 4,
  recovery: 20,
  totalFrames: 36,
  
  damage: 18,
  knockback: 80,
  angle: 45,
  
  hitboxSize: { x: 80, y: 60 },
  hitboxOffset: { x: 50, y: 0 },
  
  canCancel: false,
  priority: 7
};
```

#### Air Attack
```typescript
const airAttack: AttackFrameData = {
  startup: 8,
  active: 3,
  recovery: 15,
  totalFrames: 26,
  
  damage: 12,
  knockback: 50,
  angle: -45, // Spike angle
  
  hitboxSize: { x: 70, y: 50 },
  hitboxOffset: { x: 35, y: 20 },
  
  canCancel: false,
  priority: 5
};
```

#### Special Attack
```typescript
const specialAttack: AttackFrameData = {
  startup: 15,
  active: 6,
  recovery: 25,
  totalFrames: 46,
  
  damage: 25,
  knockback: 120,
  angle: 30,
  
  hitboxSize: { x: 100, y: 80 },
  hitboxOffset: { x: 60, y: 0 },
  
  canCancel: false,
  priority: 9
};
```

## Damage Scaling & Combos

### Damage Scaling System

```typescript
interface DamageScaling {
  // Combo scaling - reduces damage in long combos
  scalingStart: 3; // Combo hits before scaling begins
  scalingRate: 0.9; // Damage multiplier per additional hit
  minimumScaling: 0.3; // Minimum damage scaling (30%)
  
  // Stale move negation - repeated moves do less damage
  staleMoveSlots: 9; // Number of recent moves tracked
  staleReduction: 0.9; // Damage reduction per stale use
  minimumStale: 0.5; // Minimum stale damage (50%)
}

// Example combo damage calculation
function calculateComboDamage(baseDamage: number, comboHit: number): number {
  if (comboHit <= 3) return baseDamage;
  
  const scaling = Math.pow(0.9, comboHit - 3);
  return Math.max(baseDamage * scaling, baseDamage * 0.3);
}
```

### Combo System

```typescript
interface ComboSystem {
  // Hitstun duration affects combo potential
  hitstunMultiplier: 0.8; // Frames of hitstun per damage point
  
  // Combo breaking mechanics
  comboBreakThreshold: 40; // Damage threshold for combo break
  airDodgeInCombo: true; // Can air dodge during hitstun
  
  // Juggle system
  juggleDecay: 0.95; // Knockback reduction per juggle hit
  maxJuggleHits: 5; // Maximum effective juggle hits
}
```

## Stage Balance

### Stage Dimensions

```typescript
interface StageConfig {
  // Platform layout
  mainPlatform: {
    width: 800;
    height: 20;
    position: { x: 0, y: 0 };
  };
  
  // Side platforms
  leftPlatform: {
    width: 200;
    height: 15;
    position: { x: -350, y: 150 };
  };
  
  rightPlatform: {
    width: 200;
    height: 15;
    position: { x: 350, y: 150 };
  };
  
  // Blast zones
  leftBlastZone: -600;
  rightBlastZone: 600;
  topBlastZone: 400;
  bottomBlastZone: -300;
  
  // Hazards (optional)
  hazards: [];
}
```

### Stage List

#### 1. Training Arena (Neutral)
```typescript
const trainingArena: StageConfig = {
  name: "Training Arena",
  type: "neutral",
  platforms: [
    { width: 800, height: 20, position: { x: 0, y: 0 } }
  ],
  hazards: [],
  unlockRequirement: { level: 1 }
};
```

#### 2. Floating Platforms
```typescript
const floatingPlatforms: StageConfig = {
  name: "Floating Platforms",
  type: "platform",
  platforms: [
    { width: 600, height: 20, position: { x: 0, y: 0 } },
    { width: 150, height: 15, position: { x: -300, y: 120 } },
    { width: 150, height: 15, position: { x: 300, y: 120 } },
    { width: 200, height: 15, position: { x: 0, y: 200 } }
  ],
  hazards: [],
  unlockRequirement: { level: 3 }
};
```

#### 3. Hazard Zone
```typescript
const hazardZone: StageConfig = {
  name: "Hazard Zone",
  type: "hazard",
  platforms: [
    { width: 700, height: 20, position: { x: 0, y: 0 } },
    { width: 180, height: 15, position: { x: -280, y: 140 } },
    { width: 180, height: 15, position: { x: 280, y: 140 } }
  ],
  hazards: [
    {
      type: "spike_trap",
      position: { x: 0, y: -50 },
      damage: 15,
      knockback: 60,
      interval: 3000 // 3 seconds
    }
  ],
  unlockRequirement: { level: 5, wins: 10 }
};
```

## Balancing Metrics

### Win Rate Targets

```typescript
interface BalanceTargets {
  // Character win rates in competitive play
  optimalWinRate: 0.5; // 50% ideal
  acceptableRange: [0.45, 0.55]; // 45-55% acceptable
  rebalanceThreshold: [0.4, 0.6]; // Outside this triggers rebalance
  
  // Match duration targets
  averageMatchDuration: 120; // 2 minutes
  acceptableDuration: [60, 300]; // 1-5 minutes
  
  // Combo length targets
  averageComboLength: 3; // hits
  maxViableCombo: 8; // hits before forced break
}
```

### Balance Testing Framework

```typescript
interface BalanceTest {
  // Automated testing scenarios
  scenarios: [
    "character_vs_character_winrates",
    "combo_damage_scaling",
    "knockback_kill_percents",
    "movement_frame_advantages",
    "stage_position_advantages"
  ];
  
  // Testing parameters
  testMatches: 1000; // per scenario
  aiDifficulty: "competitive";
  dataCollection: [
    "damage_per_second",
    "neutral_game_wins",
    "edge_guard_success",
    "combo_frequency",
    "stock_duration"
  ];
}
```

## Progression & Unlocks

### Character Unlock System

```typescript
interface UnlockRequirement {
  character: string;
  requirements: {
    level?: number;
    wins?: number;
    playtime?: number; // minutes
    specificAchievement?: string;
  };
}

const unlockProgression: UnlockRequirement[] = [
  { character: "warrior", requirements: { level: 1 } },
  { character: "assassin", requirements: { level: 3, wins: 5 } },
  { character: "tank", requirements: { level: 5, wins: 10 } },
  { character: "mage", requirements: { level: 7, wins: 15, playtime: 60 } },
  { character: "speedster", requirements: { level: 10, wins: 25, specificAchievement: "perfect_game" } }
];
```

### Balance Update System

```typescript
interface BalanceUpdate {
  version: string;
  changes: {
    character: string;
    modifications: {
      stat: string;
      oldValue: number;
      newValue: number;
      reason: string;
    }[];
  }[];
  
  // Automatic rollback if metrics worsen
  rollbackTriggers: {
    winRateDeviation: 0.1; // 10% change triggers rollback
    playerRetention: 0.05; // 5% drop triggers rollback
    complaintThreshold: 100; // Player complaints
  };
}
```

## Competitive Balance

### Ranked Mode Considerations

```typescript
interface RankedBalance {
  // Tier restrictions
  banList: string[]; // Banned characters/stages
  stageList: string[]; // Legal stages for ranked
  
  // Match settings
  stockCount: 3;
  timeLimit: 480; // 8 minutes
  itemsEnabled: false;
  hazardsEnabled: false;
  
  // Rating adjustments
  ratingGain: {
    base: 25;
    winStreakBonus: 5;
    upsetBonus: 10; // Beating higher-rated player
  };
}
```

This balance framework ensures competitive integrity while maintaining fun, accessible gameplay for all skill levels. 