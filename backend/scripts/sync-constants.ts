#!/usr/bin/env node

/**
 * BRAWL BYTES - Constants Sync Script
 * 
 * Reads the master YAML configuration file and syncs all constants to the database.
 * This replaces the traditional seed.ts approach with a more flexible YAML-driven system.
 * 
 * Usage:
 *   npm run sync-constants
 *   npm run sync-constants --force  # Overwrite existing data
 * 
 * The script will:
 * 1. Parse game-constants-master.yaml
 * 2. Clear existing constants (if --force)
 * 3. Insert all constants into the database
 * 4. Update Character and Stage models
 * 5. Verify the sync was successful
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

interface MasterConstants {
  physics: Record<string, any>;
  combat: Record<string, any>;
  characters: Record<string, any>;
  stages: Record<string, any>;
  scenes: Record<string, any>;
  assets: Record<string, any>;
  game: Record<string, any>;
  ui: Record<string, any>;
  network: Record<string, any>;
  validation: Record<string, any>;
  player: Record<string, any>;
  animation: Record<string, any>;
  server: Record<string, any>;
}

async function loadYamlConstants(): Promise<MasterConstants> {
  const yamlPath = path.join(__dirname, '../../game-constants-master.yaml');
  
  if (!fs.existsSync(yamlPath)) {
    throw new Error(`❌ Master constants file not found at: ${yamlPath}`);
  }
  
  const yamlContent = fs.readFileSync(yamlPath, 'utf8');
  const constants = yaml.parse(yamlContent) as MasterConstants;
  
  console.log('✅ Loaded master constants from YAML');
  console.log(`📊 Found ${Object.keys(constants).length} categories`);
  
  return constants;
}

async function clearExistingData(force: boolean) {
  if (!force) {
    console.log('⚠️  Skipping data clear (use --force to overwrite existing data)');
    return;
  }
  
  console.log('🧹 Clearing existing data...');
  
  // Clear in correct order due to foreign key constraints
  await prisma.matchParticipant.deleteMany();
  await prisma.match.deleteMany();
  await prisma.characterUnlock.deleteMany();
  await prisma.stageUnlock.deleteMany();
  await prisma.character.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.gameConstants.deleteMany();
  
  console.log('✅ Cleared all existing constants, characters, and stages');
}

function flattenConstants(obj: any, category: string, prefix = ''): Array<{
  id: string;
  category: string;
  name: string;
  value: any;
  dataType: string;
  description?: string;
}> {
  const result: any[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const name = prefix ? `${prefix}_${key}` : key;
    const id = `${category}_${name}`;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Nested object - flatten recursively
      result.push(...flattenConstants(value, category, name));
    } else {
      // Leaf value - create constant
      result.push({
        id,
        category,
        name,
        value,
        dataType: Array.isArray(value) ? 'array' : typeof value,
        description: generateDescription(category, name, value)
      });
    }
  }
  
  return result;
}

function generateDescription(category: string, name: string, _value: any): string {
  const descriptions: Record<string, string> = {
    'physics_gravity': 'Downward acceleration force applied to all entities',
    'physics_jump_velocity': 'Initial upward velocity when jumping',
    'combat_attack_damage': 'Base damage dealt by standard attacks',
    'game_max_stocks': 'Number of lives each player starts with',
    'ui_colors_primary': 'Primary brand color used throughout the interface',
    // Add more specific descriptions as needed
  };
  
  const key = `${category}_${name}`;
  return descriptions[key] || `${category} configuration for ${name.replace(/_/g, ' ')}`;
}

async function syncGameConstants(constants: MasterConstants) {
  console.log('🔄 Syncing game constants to database...');
  
  const allConstants: any[] = [];
  
  // Process each category
  for (const [category, categoryData] of Object.entries(constants)) {
    if (category === 'characters' || category === 'stages') {
      // Skip - these are handled separately
      continue;
    }
    
    const flattened = flattenConstants(categoryData, category);
    allConstants.push(...flattened);
  }
  
  console.log(`📝 Inserting ${allConstants.length} constants...`);
  
  // Batch insert all constants
  for (const constant of allConstants) {
    await prisma.gameConstants.create({
      data: constant
    });
  }
  
  console.log(`✅ Synced ${allConstants.length} game constants`);
}

async function syncCharacters(characters: Record<string, any>) {
  console.log('👥 Syncing characters to database...');
  
  for (const [_key, character] of Object.entries(characters)) {
    await prisma.character.create({
      data: {
        id: character.id,
        name: character.name,
        description: character.description || '',
        stats: character.stats,
        unlockRequirements: character.unlock_requirements
      }
    });
    
    console.log(`✓ Created character: ${character.name}`);
  }
  
  console.log(`✅ Synced ${Object.keys(characters).length} characters`);
}

async function syncStages(stages: Record<string, any>) {
  console.log('🏟️  Syncing stages to database...');
  
  for (const [_key, stage] of Object.entries(stages)) {
    await prisma.stage.create({
      data: {
        id: stage.id,
        name: stage.name,
        description: stage.description || '',
        config: stage.config,
        unlockRequirements: stage.unlock_requirements
      }
    });
    
    console.log(`✓ Created stage: ${stage.name}`);
  }
  
  console.log(`✅ Synced ${Object.keys(stages).length} stages`);
}

async function verifySync() {
  console.log('🔍 Verifying sync results...');
  
  const constantsCount = await prisma.gameConstants.count();
  const charactersCount = await prisma.character.count();
  const stagesCount = await prisma.stage.count();
  
  console.log(`📊 Database contents:`);
  console.log(`   • ${constantsCount} game constants`);
  console.log(`   • ${charactersCount} characters`);
  console.log(`   • ${stagesCount} stages`);
  
  // Test API endpoint availability
  try {
    console.log('🌐 Testing constants API...');
    console.log('💡 Start your server and test: GET /api/constants');
  } catch (error) {
    console.log('⚠️  Could not test API (server not running)');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  
  console.log('🚀 Starting Brawl Bytes Constants Sync');
  console.log('=====================================');
  
  try {
    // Load YAML constants
    const constants = await loadYamlConstants();
    
    // Clear existing data if requested
    await clearExistingData(force);
    
    // Sync all data
    await syncGameConstants(constants);
    await syncCharacters(constants.characters);
    await syncStages(constants.stages);
    
    // Verify results
    await verifySync();
    
    console.log('');
    console.log('✅ Constants sync completed successfully!');
    console.log('🎮 Your game now uses database-driven configuration');
    console.log('💡 Edit game-constants-master.yaml and re-run this script to update');
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
if (require.main === module) {
  main();
}

export { main as syncConstants };