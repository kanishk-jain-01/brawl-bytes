# Jungle Theme Implementation Task List

## Overview
This task list will guide you through transforming the Brawl Bytes game UI from its current dark blue theme to an immersive jungle theme. Follow these steps in order to ensure a smooth implementation.

## Prerequisites
- Access to AI image/video generation tools
- Basic understanding of TypeScript and Phaser 3
- Familiarity with the existing codebase structure

---

## Phase 1: Asset Storage Setup

### Task 1.1: Create Asset Directory Structure
**Files to modify:** None (creating new directories)

1. Create the asset storage directory structure:
   ```bash
   mkdir -p backend/public/assets/backgrounds
   mkdir -p backend/public/assets/characters
   mkdir -p backend/public/assets/ui
   mkdir -p backend/public/assets/audio
   mkdir -p backend/public/assets/effects
   ```

2. Create subdirectories for UI elements:
   ```bash
   mkdir -p backend/public/assets/ui/buttons
   mkdir -p backend/public/assets/ui/badges
   mkdir -p backend/public/assets/ui/decorations
   ```

### Task 1.2: Configure Express Static Asset Serving
**Files to modify:** `backend/src/server.ts` (or main server file)

1. Find your Express server setup file
2. Add static asset serving middleware:
   ```typescript
   import express from 'express';
   import path from 'path';
   
   // Add this line after your other middleware
   app.use('/assets', express.static(path.join(__dirname, '../public/assets')));
   ```

3. Test by creating a test image file in `backend/public/assets/test.png`
4. Navigate to `http://localhost:3001/assets/test.png` to verify it loads

---

## Phase 2: Generate Jungle Assets

### Task 2.1: Generate Background Assets
**AI Generation Required:** Yes

Generate the following assets using your AI tools:

1. **Main Menu Background** (`jungle-canopy.mp4`)
   - **Prompt:** "Dense jungle canopy with dappled sunlight filtering through leaves, gentle swaying branches, animated falling leaves, cinematic lighting, looping video, 4K resolution"
   - **Specs:** 5-second loop, 1920x1080, MP4 format
   - **Save as:** `backend/public/assets/backgrounds/jungle-canopy.mp4`

2. **Character Select Background** (`ancient-colosseum.mp4`)
   - **Prompt:** "Ancient stone colosseum overgrown with jungle vines, misty atmosphere, dramatic shadows, crumbling ruins, fantasy game environment, looping video"
   - **Specs:** 5-second loop, 1920x1080, MP4 format
   - **Save as:** `backend/public/assets/backgrounds/ancient-colosseum.mp4`

3. **Lobby Background** (`jungle-clearing.mp4`)
   - **Prompt:** "Jungle clearing with crackling campfire in center, dancing shadows on surrounding trees, warm amber lighting, peaceful ambiance, looping video"
   - **Specs:** 5-second loop, 1920x1080, MP4 format
   - **Save as:** `backend/public/assets/backgrounds/jungle-clearing.mp4`

4. **Stage Select Background** (`map-table.mp4`)
   - **Prompt:** "Ancient wooden table with jungle territory maps, parchment scrolls, tribal artifacts, flickering torch light, adventure game aesthetic, looping video"
   - **Specs:** 5-second loop, 1920x1080, MP4 format
   - **Save as:** `backend/public/assets/backgrounds/map-table.mp4`

### Task 2.2: Generate UI Elements
**AI Generation Required:** Yes

Generate the following UI assets:

1. **Jungle Logo** (`jungle-medallion-logo.png`)
   - **Prompt:** "Jungle medallion logo with 'BB' carved in ancient stone, surrounded by tribal vines, moss growth, emerald green accents, game logo style"
   - **Specs:** 200x200px, PNG with transparency
   - **Save as:** `backend/public/assets/ui/jungle-medallion-logo.png`

2. **Wooden Button Set**
   - **Normal State** (`wooden-plank-button.png`)
     - **Prompt:** "Weathered wooden plank button with carved text area, jungle vine borders, natural wood texture, game UI element"
     - **Specs:** 200x60px, PNG with transparency
     - **Save as:** `backend/public/assets/ui/buttons/wooden-plank-button.png`
   
   - **Hover State** (`wooden-plank-button-hover.png`)
     - **Prompt:** "Weathered wooden plank button with glowing tribal runes, warm light effect, jungle vine borders, game UI element"
     - **Specs:** 200x60px, PNG with transparency
     - **Save as:** `backend/public/assets/ui/buttons/wooden-plank-button-hover.png`

3. **Character Pedestals** (`stone-pedestal.png`)
   - **Prompt:** "Ancient stone pedestal with jungle vines growing around base, weathered surface, suitable for character statue, isometric game view"
   - **Specs:** 300x200px, PNG with transparency
   - **Save as:** `backend/public/assets/ui/stone-pedestal.png`

4. **Tribal Status Masks**
   - **Ready Mask** (`tribal-mask-ready.png`)
     - **Prompt:** "Tribal mask with glowing green eyes, peaceful expression, jungle warrior aesthetic, game UI icon"
     - **Specs:** 64x64px, PNG with transparency
     - **Save as:** `backend/public/assets/ui/tribal-mask-ready.png`
   
   - **Not Ready Mask** (`tribal-mask-not-ready.png`)
     - **Prompt:** "Tribal mask with dim red eyes, neutral expression, jungle warrior aesthetic, game UI icon"
     - **Specs:** 64x64px, PNG with transparency
     - **Save as:** `backend/public/assets/ui/tribal-mask-not-ready.png`

5. **Wooden Nameplate** (`wooden-nameplate.png`)
   - **Prompt:** "Wooden nameplate hanging from jungle vines, carved text area, natural wood texture, game UI element"
   - **Specs:** 250x80px, PNG with transparency
   - **Save as:** `backend/public/assets/ui/wooden-nameplate.png`

6. **Ceremonial Headdress** (`ceremonial-headdress.png`)
   - **Prompt:** "Tribal ceremonial headdress with feathers and jungle ornaments, leader/host indicator, game UI icon"
   - **Specs:** 64x64px, PNG with transparency
   - **Save as:** `backend/public/assets/ui/ceremonial-headdress.png`

7. **Difficulty Shield Badges**
   - **Easy Shield** (`easy-shield.png`)
     - **Prompt:** "Tribal wooden shield with rabbit totem carving, simple design, easy difficulty indicator, game UI badge"
     - **Specs:** 48x48px, PNG with transparency
     - **Save as:** `backend/public/assets/ui/badges/easy-shield.png`
   
   - **Medium Shield** (`medium-shield.png`)
     - **Prompt:** "Tribal wooden shield with jaguar totem carving, moderate detail, medium difficulty indicator, game UI badge"
     - **Specs:** 48x48px, PNG with transparency
     - **Save as:** `backend/public/assets/ui/badges/medium-shield.png`
   
   - **Hard Shield** (`hard-shield.png`)
     - **Prompt:** "Tribal wooden shield with serpent totem carving, intricate design, hard difficulty indicator, game UI badge"
     - **Specs:** 48x48px, PNG with transparency
     - **Save as:** `backend/public/assets/ui/badges/hard-shield.png`

### Task 2.3: Generate Character Assets
**AI Generation Required:** Yes

Generate placeholder character images:

1. **Jungle Dash** (`jungle-dash.png`)
   - **Prompt:** "Jungle warrior character with light armor, speed-focused design, tribal tattoos, agile stance, game character portrait"
   - **Specs:** 200x200px, PNG with transparency
   - **Save as:** `backend/public/assets/characters/jungle-dash.png`

2. **Jungle Rex** (`jungle-rex.png`)
   - **Prompt:** "Balanced jungle fighter with moderate armor, tribal weapons, confident stance, game character portrait"
   - **Specs:** 200x200px, PNG with transparency
   - **Save as:** `backend/public/assets/characters/jungle-rex.png`

3. **Jungle Titan** (`jungle-titan.png`)
   - **Prompt:** "Heavy jungle warrior with thick armor, massive tribal weapons, imposing stance, game character portrait"
   - **Specs:** 200x200px, PNG with transparency
   - **Save as:** `backend/public/assets/characters/jungle-titan.png`

4. **Jungle Ninja** (`jungle-ninja.png`)
   - **Prompt:** "Stealthy jungle assassin with minimal armor, tribal stealth gear, crouched stance, game character portrait"
   - **Specs:** 200x200px, PNG with transparency
   - **Save as:** `backend/public/assets/characters/jungle-ninja.png`

### Task 2.4: Generate Audio Assets
**AI Generation Required:** Yes

Generate or source the following audio files:

1. **Jungle Ambient Music** (`jungle-ambient.mp3`)
   - **Prompt/Source:** "Peaceful jungle ambiance with bird calls, rustling leaves, distant water, looping background music"
   - **Specs:** 2-minute loop, MP3 format
   - **Save as:** `backend/public/assets/audio/jungle-ambient.mp3`

2. **Wooden UI Click** (`wooden-click.mp3`)
   - **Prompt/Source:** "Wooden click sound effect, natural wood tapping, UI interaction sound"
   - **Specs:** Short sound effect, MP3 format
   - **Save as:** `backend/public/assets/audio/wooden-click.mp3`

3. **Tribal Drums** (`tribal-drums.mp3`)
   - **Prompt/Source:** "Tribal drum beats, ceremonial rhythm, jungle atmosphere, looping"
   - **Specs:** 30-second loop, MP3 format
   - **Save as:** `backend/public/assets/audio/tribal-drums.mp3`

---

## Phase 3: Update Configuration

### Task 3.1: Update YAML Configuration
**Files to modify:** `game-constants-master.yaml`

1. Open `game-constants-master.yaml`
2. Find the `assets` section
3. Add the `base_url` configuration:
   ```yaml
   assets:
     base_url: "http://localhost:3001/assets"  # For development
     # base_url: "https://your-domain.com/assets"  # For production
   ```

4. Update the `images` section to use new jungle assets:
   ```yaml
   images:
     logo: "ui/jungle-medallion-logo.png"
     background_menu: "backgrounds/jungle-canopy.mp4"
     background_stage1: "backgrounds/ancient-colosseum.mp4"
     background_stage2: "backgrounds/jungle-clearing.mp4"
     background_stage3: "backgrounds/map-table.mp4"
     character_dash: "characters/jungle-dash.png"
     character_rex: "characters/jungle-rex.png"
     character_titan: "characters/jungle-titan.png"
     character_ninja: "characters/jungle-ninja.png"
     platform: "platform"  # Keep existing for now
     ui_button: "ui/buttons/wooden-plank-button.png"
     ui_button_hover: "ui/buttons/wooden-plank-button-hover.png"
     health_bar: "health_bar"  # Keep existing for now
     energy_bar: "energy_bar"  # Keep existing for now
     
     # New jungle-specific assets
     stone_pedestal: "ui/stone-pedestal.png"
     tribal_mask_ready: "ui/tribal-mask-ready.png"
     tribal_mask_not_ready: "ui/tribal-mask-not-ready.png"
     wooden_nameplate: "ui/wooden-nameplate.png"
     ceremonial_headdress: "ui/ceremonial-headdress.png"
     easy_shield: "ui/badges/easy-shield.png"
     medium_shield: "ui/badges/medium-shield.png"
     hard_shield: "ui/badges/hard-shield.png"
   ```

5. Update the `audio` section:
   ```yaml
   audio:
     menu_music: "audio/jungle-ambient.mp3"
     game_music: "game_music"  # Keep existing for now
     battle_theme: "battle_theme"  # Keep existing for now
     sky_theme: "sky_theme"  # Keep existing for now
     volcano_theme: "volcano_theme"  # Keep existing for now
     sfx_jump: "sfx_jump"  # Keep existing for now
     sfx_attack: "sfx_attack"  # Keep existing for now
     sfx_hit: "sfx_hit"  # Keep existing for now
     sfx_button: "audio/wooden-click.mp3"
     sfx_victory: "sfx_victory"  # Keep existing for now
     sfx_defeat: "sfx_defeat"  # Keep existing for now
     
     # New jungle-specific audio
     tribal_drums: "audio/tribal-drums.mp3"
   ```

### Task 3.2: Update UI Color Palette
**Files to modify:** `game-constants-master.yaml`

1. In the same YAML file, find the `ui.colors` section
2. Replace the existing colors with jungle theme colors:
   ```yaml
   ui:
     colors:
       primary: "#4caf50"        # Jungle Green
       secondary: "#1a4a3a"      # Deep Forest Green
       success: "#66bb6a"        # Light Green
       danger: "#c62828"         # Vine Red
       warning: "#f9a825"        # Bamboo Gold
       text: "#ffffff"           # White (keep)
       text_secondary: "#a5d6a7" # Light Forest Green
       background: "#2e5230"     # Dark Forest
       accent: "#ff6f00"         # Tribal Orange
   ```

### Task 3.3: Sync Configuration to Database
**Command to run:** `npm run sync-constants`

1. Save all changes to `game-constants-master.yaml`
2. Run the sync command to update the database:
   ```bash
   npm run sync-constants
   ```
3. Verify the command completes successfully
4. Check that no errors are reported

---

## Phase 4: Update Asset Loading System

### Task 4.1: Modify BootScene Asset Loading
**Files to modify:** `frontend/src/scenes/BootScene.ts`

1. Open `frontend/src/scenes/BootScene.ts`
2. Find the `loadAssets()` method around line 105
3. Replace the entire method with:
   ```typescript
   private loadAssets(): void {
     // Get base URL from constants (loaded from database)
     const baseUrl = GAME_CONFIG.ASSETS?.BASE_URL || '';
     
     // Load jungle logo
     this.load.image(
       ASSET_KEYS.IMAGES.LOGO,
       `${baseUrl}/${ASSET_KEYS.IMAGES.LOGO}`
     );
     
     // Load wooden UI button
     this.load.image(
       ASSET_KEYS.IMAGES.UI_BUTTON,
       `${baseUrl}/${ASSET_KEYS.IMAGES.UI_BUTTON}`
     );
     
     // Load wooden UI button hover state
     this.load.image(
       ASSET_KEYS.IMAGES.UI_BUTTON_HOVER,
       `${baseUrl}/${ASSET_KEYS.IMAGES.UI_BUTTON_HOVER}`
     );
     
     // Load platform (keep existing base64 for now)
     this.load.image(
       ASSET_KEYS.IMAGES.PLATFORM,
       'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAiIGZpbGw9IiM5NWE1YTYiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjUiIGZpbGw9IiM3ZjhlOGYiLz4KPC9zdmc+'
     );
     
     // Load character images
     this.load.image(
       ASSET_KEYS.IMAGES.CHARACTER_DASH,
       `${baseUrl}/${ASSET_KEYS.IMAGES.CHARACTER_DASH}`
     );
     
     this.load.image(
       ASSET_KEYS.IMAGES.CHARACTER_REX,
       `${baseUrl}/${ASSET_KEYS.IMAGES.CHARACTER_REX}`
     );
     
     this.load.image(
       ASSET_KEYS.IMAGES.CHARACTER_TITAN,
       `${baseUrl}/${ASSET_KEYS.IMAGES.CHARACTER_TITAN}`
     );
     
     this.load.image(
       ASSET_KEYS.IMAGES.CHARACTER_NINJA,
       `${baseUrl}/${ASSET_KEYS.IMAGES.CHARACTER_NINJA}`
     );
     
     // Load new jungle-specific assets
     this.load.image('stone_pedestal', `${baseUrl}/ui/stone-pedestal.png`);
     this.load.image('tribal_mask_ready', `${baseUrl}/ui/tribal-mask-ready.png`);
     this.load.image('tribal_mask_not_ready', `${baseUrl}/ui/tribal-mask-not-ready.png`);
     this.load.image('wooden_nameplate', `${baseUrl}/ui/wooden-nameplate.png`);
     this.load.image('ceremonial_headdress', `${baseUrl}/ui/ceremonial-headdress.png`);
     this.load.image('easy_shield', `${baseUrl}/ui/badges/easy-shield.png`);
     this.load.image('medium_shield', `${baseUrl}/ui/badges/medium-shield.png`);
     this.load.image('hard_shield', `${baseUrl}/ui/badges/hard-shield.png`);
     
     // Load background videos
     this.load.video('jungle_canopy', `${baseUrl}/backgrounds/jungle-canopy.mp4`);
     this.load.video('ancient_colosseum', `${baseUrl}/backgrounds/ancient-colosseum.mp4`);
     this.load.video('jungle_clearing', `${baseUrl}/backgrounds/jungle-clearing.mp4`);
     this.load.video('map_table', `${baseUrl}/backgrounds/map-table.mp4`);
     
     // Load audio files
     this.load.audio('jungle_ambient', `${baseUrl}/audio/jungle-ambient.mp3`);
     this.load.audio('wooden_click', `${baseUrl}/audio/wooden-click.mp3`);
     this.load.audio('tribal_drums', `${baseUrl}/audio/tribal-drums.mp3`);
     
     // Keep existing placeholder loading for development
     for (let i = 0; i < 10; i += 1) {
       this.load.image(
         `placeholder_${i}`,
         'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
       );
     }
   }
   ```

### Task 4.2: Add Error Handling for Asset Loading
**Files to modify:** `frontend/src/scenes/BootScene.ts`

1. In the same file, find the `setupLoadingEvents()` method
2. Add error handling by inserting this code after the existing load events:
   ```typescript
   // Add this inside setupLoadingEvents() method after existing events
   this.load.on('loaderror', (file: Phaser.Loader.File) => {
     console.error(`Failed to load asset: ${file.key} from ${file.url}`);
     this.loadingText.setText(`Error loading: ${file.key}`);
     this.loadingText.setStyle({ color: '#ff0000' });
   });
   ```

---

## Phase 5: Update Scene Backgrounds

### Task 5.1: Update MenuScene Background
**Files to modify:** `frontend/src/scenes/MenuScene.ts`

1. Open `frontend/src/scenes/MenuScene.ts`
2. Find the `create()` method
3. Replace the background creation code with:
   ```typescript
   // Find the line that creates the background (around line 25-30)
   // Replace the existing background creation with:
   
   // Create jungle canopy video background
   const jungleVideo = this.add.video(width / 2, height / 2, 'jungle_canopy');
   jungleVideo.setDisplaySize(width, height);
   jungleVideo.setDepth(-1);
   jungleVideo.play(true); // Loop the video
   
   // Add subtle overlay for better text readability
   this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.2);
   ```

4. Update the title text styling to match jungle theme:
   ```typescript
   // Find the title text creation and update the style
   const titleText = this.add.text(width / 2, height / 2 - 200, 'BRAWL BYTES', {
     fontSize: '72px',
     color: GAME_CONFIG.UI.COLORS.TEXT,
     fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
     fontStyle: 'bold',
     stroke: '#1a4a3a',
     strokeThickness: 4,
   });
   ```

### Task 5.2: Update CharacterSelectScene Background
**Files to modify:** `frontend/src/scenes/CharacterSelectScene.ts`

1. Open `frontend/src/scenes/CharacterSelectScene.ts`
2. Find the `create()` method
3. Replace the background creation with:
   ```typescript
   // Replace existing background creation with:
   
   // Create ancient colosseum video background
   const colosseumVideo = this.add.video(width / 2, height / 2, 'ancient_colosseum');
   colosseumVideo.setDisplaySize(width, height);
   colosseumVideo.setDepth(-1);
   colosseumVideo.play(true);
   
   // Add overlay for readability
   this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.3);
   ```

4. Update the title text:
   ```typescript
   // Update the title text styling
   const titleText = this.add.text(width / 2, 100, 'CHOOSE YOUR WARRIOR', {
     fontSize: '48px',
     color: GAME_CONFIG.UI.COLORS.TEXT,
     fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
     fontStyle: 'bold',
     stroke: '#1a4a3a',
     strokeThickness: 3,
   });
   ```

### Task 5.3: Update StageSelectScene Background
**Files to modify:** `frontend/src/scenes/StageSelectScene.ts`

1. Open `frontend/src/scenes/StageSelectScene.ts`
2. Find the `create()` method
3. Replace the background creation with:
   ```typescript
   // Replace existing background creation with:
   
   // Create map table video background
   const mapTableVideo = this.add.video(width / 2, height / 2, 'map_table');
   mapTableVideo.setDisplaySize(width, height);
   mapTableVideo.setDepth(-1);
   mapTableVideo.play(true);
   
   // Add overlay for readability
   this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.25);
   ```

4. Update the title text:
   ```typescript
   // Update the title text styling
   const titleText = this.add.text(width / 2, 100, 'SELECT BATTLEGROUND', {
     fontSize: '48px',
     color: GAME_CONFIG.UI.COLORS.TEXT,
     fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
     fontStyle: 'bold',
     stroke: '#1a4a3a',
     strokeThickness: 3,
   });
   ```

### Task 5.4: Update PreMatchLobbyScene Background
**Files to modify:** `frontend/src/scenes/PreMatchLobbyScene.ts`

1. Open `frontend/src/scenes/PreMatchLobbyScene.ts`
2. Find the `create()` method
3. Replace the background creation with:
   ```typescript
   // Replace existing background creation with:
   
   // Create jungle clearing video background
   const clearingVideo = this.add.video(width / 2, height / 2, 'jungle_clearing');
   clearingVideo.setDisplaySize(width, height);
   clearingVideo.setDepth(-1);
   clearingVideo.play(true);
   
   // Add overlay for readability
   this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.3);
   ```

---

## Phase 6: Update UI Components

### Task 6.1: Update Character Cards in CharacterSelectScene
**Files to modify:** `frontend/src/scenes/CharacterSelectScene.ts`

1. Open `frontend/src/scenes/CharacterSelectScene.ts`
2. Find the `createCharacterCard()` method
3. Replace the character card creation with:
   ```typescript
   private createCharacterCard(character: any, x: number, y: number): Phaser.GameObjects.Container {
     const card = this.add.container(x, y);
     
     // Add stone pedestal base
     const pedestal = this.add.image(0, 50, 'stone_pedestal');
     pedestal.setScale(0.8);
     card.add(pedestal);
     
     // Add character image on pedestal
     const characterImage = this.add.image(0, -20, character.id);
     characterImage.setDisplaySize(120, 120);
     card.add(characterImage);
     
     // Create wooden nameplate for character name
     const nameplate = this.add.image(0, 120, 'wooden_nameplate');
     nameplate.setScale(0.6);
     card.add(nameplate);
     
     // Character name text
     const nameText = this.add.text(0, 120, character.name, {
       fontSize: '18px',
       color: '#2e5230',
       fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
       fontStyle: 'bold',
     });
     nameText.setOrigin(0.5);
     card.add(nameText);
     
     // Add tribal stat symbols instead of bars
     const statsY = 180;
     const statSpacing = 80;
     
     // Speed stat (cheetah symbol)
     const speedSymbol = this.add.text(-statSpacing, statsY, '🐆', { fontSize: '24px' });
     speedSymbol.setOrigin(0.5);
     card.add(speedSymbol);
     
     // Health stat (tree symbol)
     const healthSymbol = this.add.text(0, statsY, '🌳', { fontSize: '24px' });
     healthSymbol.setOrigin(0.5);
     card.add(healthSymbol);
     
     // Attack stat (spear symbol)
     const attackSymbol = this.add.text(statSpacing, statsY, '🔱', { fontSize: '24px' });
     attackSymbol.setOrigin(0.5);
     card.add(attackSymbol);
     
     // Add stat values below symbols
     const speedValue = this.add.text(-statSpacing, statsY + 25, character.stats.speed.toString(), {
       fontSize: '14px',
       color: GAME_CONFIG.UI.COLORS.TEXT,
       fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
     });
     speedValue.setOrigin(0.5);
     card.add(speedValue);
     
     const healthValue = this.add.text(0, statsY + 25, character.stats.health.toString(), {
       fontSize: '14px',
       color: GAME_CONFIG.UI.COLORS.TEXT,
       fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
     });
     healthValue.setOrigin(0.5);
     card.add(healthValue);
     
     const attackValue = this.add.text(statSpacing, statsY + 25, character.stats.attack_damage.toString(), {
       fontSize: '14px',
       color: GAME_CONFIG.UI.COLORS.TEXT,
       fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
     });
     attackValue.setOrigin(0.5);
     card.add(attackValue);
     
     // Add hover effects
     card.setInteractive(new Phaser.Geom.Rectangle(-100, -100, 200, 300), Phaser.Geom.Rectangle.Contains);
     
     card.on('pointerover', () => {
       this.tweens.add({
         targets: card,
         scaleX: 1.05,
         scaleY: 1.05,
         duration: 200,
         ease: 'Power2',
       });
       
       // Add glowing rune effect
       const runeGlow = this.add.circle(0, 0, 120, 0xf9a825, 0.3);
       runeGlow.setName('runeGlow');
       card.add(runeGlow);
     });
     
     card.on('pointerout', () => {
       this.tweens.add({
         targets: card,
         scaleX: 1,
         scaleY: 1,
         duration: 200,
         ease: 'Power2',
       });
       
       // Remove glowing rune effect
       const runeGlow = card.getByName('runeGlow');
       if (runeGlow) {
         runeGlow.destroy();
       }
     });
     
     return card;
   }
   ```

### Task 6.2: Update Stage Cards in StageSelectScene
**Files to modify:** `frontend/src/scenes/StageSelectScene.ts`

1. Open `frontend/src/scenes/StageSelectScene.ts`
2. Find the `createStageCard()` method
3. Replace the stage card creation with:
   ```typescript
   private createStageCard(stage: any, x: number, y: number): Phaser.GameObjects.Container {
     const card = this.add.container(x, y);
     
     // Create wooden frame for stage preview
     const frame = this.add.rectangle(0, 0, 280, 200, 0x5d4e37);
     frame.setStrokeStyle(4, 0x3e2723);
     card.add(frame);
     
     // Add inner frame with darker background
     const innerFrame = this.add.rectangle(0, 0, 260, 180, 0x2e5230);
     card.add(innerFrame);
     
     // Stage preview (simplified platform layout)
     const previewContainer = this.add.container(0, -20);
     
     // Create simple platform representation
     stage.config.platforms.forEach((platform: any, index: number) => {
       const platformSprite = this.add.rectangle(
         (platform.x - 1000) * 0.1, // Scale and center
         (platform.y - 600) * 0.1,
         platform.width * 20,
         platform.height * 10,
         0x8d6e63
       );
       previewContainer.add(platformSprite);
     });
     
     card.add(previewContainer);
     
     // Add difficulty shield badge
     let shieldKey = 'easy_shield';
     if (stage.difficulty === 'Medium') shieldKey = 'medium_shield';
     if (stage.difficulty === 'Hard') shieldKey = 'hard_shield';
     
     const difficultyShield = this.add.image(-100, -80, shieldKey);
     difficultyShield.setScale(0.8);
     card.add(difficultyShield);
     
     // Stage name on wooden plaque
     const nameplate = this.add.image(0, 80, 'wooden_nameplate');
     nameplate.setScale(0.4);
     card.add(nameplate);
     
     const nameText = this.add.text(0, 80, stage.name, {
       fontSize: '16px',
       color: '#2e5230',
       fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
       fontStyle: 'bold',
     });
     nameText.setOrigin(0.5);
     card.add(nameText);
     
     // Add hover effects
     card.setInteractive(new Phaser.Geom.Rectangle(-140, -100, 280, 200), Phaser.Geom.Rectangle.Contains);
     
     card.on('pointerover', () => {
       this.tweens.add({
         targets: card,
         scaleX: 1.05,
         scaleY: 1.05,
         duration: 200,
         ease: 'Power2',
       });
       
       // Add tribal glow effect
       const tribalGlow = this.add.circle(0, 0, 150, 0xf9a825, 0.2);
       tribalGlow.setName('tribalGlow');
       card.add(tribalGlow);
     });
     
     card.on('pointerout', () => {
       this.tweens.add({
         targets: card,
         scaleX: 1,
         scaleY: 1,
         duration: 200,
         ease: 'Power2',
       });
       
       // Remove tribal glow effect
       const tribalGlow = card.getByName('tribalGlow');
       if (tribalGlow) {
         tribalGlow.destroy();
       }
     });
     
     return card;
   }
   ```

### Task 6.3: Update Player Cards in PreMatchLobbyScene
**Files to modify:** `frontend/src/scenes/PreMatchLobbyScene.ts`

1. Open `frontend/src/scenes/PreMatchLobbyScene.ts`
2. Find the `createPlayerCard()` method
3. Replace the player card creation with:
   ```typescript
   private createPlayerCard(player: any, x: number, y: number): Phaser.GameObjects.Container {
     const card = this.add.container(x, y);
     
     // Create wooden nameplate base
     const nameplate = this.add.image(0, 0, 'wooden_nameplate');
     nameplate.setScale(0.8);
     card.add(nameplate);
     
     // Player name text
     const nameText = this.add.text(0, -10, player.username, {
       fontSize: '18px',
       color: '#2e5230',
       fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
       fontStyle: 'bold',
     });
     nameText.setOrigin(0.5);
     card.add(nameText);
     
     // Character selection display
     if (player.selectedCharacter) {
       const characterText = this.add.text(0, 15, player.selectedCharacter, {
         fontSize: '14px',
         color: '#1a4a3a',
         fontFamily: GAME_CONFIG.UI.FONTS.SECONDARY,
       });
       characterText.setOrigin(0.5);
       card.add(characterText);
     }
     
     // Tribal mask for ready status
     const maskKey = player.isReady ? 'tribal_mask_ready' : 'tribal_mask_not_ready';
     const statusMask = this.add.image(80, 0, maskKey);
     statusMask.setScale(0.6);
     card.add(statusMask);
     
     // Host indicator (ceremonial headdress instead of crown)
     if (player.isHost) {
       const hostIndicator = this.add.image(-80, 0, 'ceremonial_headdress');
       hostIndicator.setScale(0.6);
       card.add(hostIndicator);
     }
     
     // Connection status (torch flame brightness)
     const connectionIndicator = this.add.text(0, 40, player.isConnected ? '🔥' : '🪶', {
       fontSize: '16px',
     });
     connectionIndicator.setOrigin(0.5);
     card.add(connectionIndicator);
     
     // Add subtle hover effect
     card.setInteractive(new Phaser.Geom.Rectangle(-120, -40, 240, 80), Phaser.Geom.Rectangle.Contains);
     
     card.on('pointerover', () => {
       this.tweens.add({
         targets: nameplate,
         scaleX: 0.85,
         scaleY: 0.85,
         duration: 200,
         ease: 'Power2',
       });
     });
     
     card.on('pointerout', () => {
       this.tweens.add({
         targets: nameplate,
         scaleX: 0.8,
         scaleY: 0.8,
         duration: 200,
         ease: 'Power2',
       });
     });
     
     return card;
   }
   ```

### Task 6.4: Update Button Styling Across All Scenes
**Files to modify:** Multiple scene files

For each scene file (`MenuScene.ts`, `CharacterSelectScene.ts`, `StageSelectScene.ts`, `PreMatchLobbyScene.ts`):

1. Find button creation methods
2. Replace button creation with wooden button style:
   ```typescript
   private createWoodenButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
     const button = this.add.container(x, y);
     
     // Wooden button background
     const buttonBg = this.add.image(0, 0, ASSET_KEYS.IMAGES.UI_BUTTON);
     buttonBg.setScale(1);
     button.add(buttonBg);
     
     // Button text
     const buttonText = this.add.text(0, 0, text, {
       fontSize: '20px',
       color: '#2e5230',
       fontFamily: GAME_CONFIG.UI.FONTS.PRIMARY,
       fontStyle: 'bold',
     });
     buttonText.setOrigin(0.5);
     button.add(buttonText);
     
     // Make interactive
     button.setInteractive(new Phaser.Geom.Rectangle(-100, -30, 200, 60), Phaser.Geom.Rectangle.Contains);
     
     // Hover effects
     button.on('pointerover', () => {
       buttonBg.setTexture(ASSET_KEYS.IMAGES.UI_BUTTON_HOVER);
       buttonText.setStyle({ color: '#f9a825' });
       this.tweens.add({
         targets: button,
         scaleX: 1.05,
         scaleY: 1.05,
         duration: 200,
         ease: 'Power2',
       });
     });
     
     button.on('pointerout', () => {
       buttonBg.setTexture(ASSET_KEYS.IMAGES.UI_BUTTON);
       buttonText.setStyle({ color: '#2e5230' });
       this.tweens.add({
         targets: button,
         scaleX: 1,
         scaleY: 1,
         duration: 200,
         ease: 'Power2',
       });
     });
     
     // Click handler
     button.on('pointerdown', () => {
       this.tweens.add({
         targets: button,
         scaleX: 0.95,
         scaleY: 0.95,
         duration: 100,
         ease: 'Power2',
         yoyo: true,
         onComplete: callback,
       });
     });
     
     return button;
   }
   ```

3. Replace all existing button creation calls with calls to this new method.

---

## Phase 7: Testing and Refinement

### Task 7.1: Test Asset Loading
**Action:** Manual testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:5173` (or your frontend URL)

3. Check the browser console for any asset loading errors

4. Verify all images and videos load correctly

5. Test each scene transition:
   - Boot → Menu
   - Menu → Character Select
   - Character Select → Stage Select
   - Stage Select → Lobby

6. Document any missing assets or loading issues

### Task 7.2: Test UI Interactions
**Action:** Manual testing

1. Test all button hover effects work correctly

2. Test character selection interactions:
   - Hover effects on character cards
   - Selection highlighting
   - Stat display

3. Test stage selection interactions:
   - Hover effects on stage cards
   - Difficulty badge display
   - Stage preview rendering

4. Test lobby player cards:
   - Ready status indicators
   - Host indicators
   - Connection status display

### Task 7.3: Test Audio Integration
**Action:** Manual testing

1. Verify jungle ambient music plays on menu scene

2. Test UI click sounds on button interactions

3. Check audio volume levels are appropriate

4. Ensure audio loops correctly

### Task 7.4: Cross-Browser Testing
**Action:** Manual testing

1. Test in Chrome, Firefox, and Safari

2. Verify video backgrounds work in all browsers

3. Check for any browser-specific styling issues

4. Test performance with video backgrounds

### Task 7.5: Mobile Responsiveness Check
**Action:** Manual testing

1. Test on mobile device or browser dev tools

2. Verify video backgrounds scale correctly

3. Check button sizes are appropriate for touch

4. Test all interactions work on mobile

---

## Phase 8: Performance Optimization

### Task 8.1: Optimize Video Assets
**Action:** Asset optimization

1. Check video file sizes (should be under 5MB each)

2. If files are too large, compress them:
   - Use H.264 codec
   - Reduce resolution to 1280x720 if needed
   - Lower bitrate while maintaining quality

3. Consider creating WebM versions for better compression:
   ```bash
   ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 -b:a 128k output.webm
   ```

### Task 8.2: Implement Asset Preloading
**Files to modify:** `frontend/src/scenes/BootScene.ts`

1. Add preload hints for critical assets

2. Implement progressive loading for non-critical assets

3. Add loading progress indicators for large video files

### Task 8.3: Add Error Fallbacks
**Files to modify:** `frontend/src/scenes/BootScene.ts`

1. Add fallback images for failed video loads

2. Implement graceful degradation for missing assets

3. Add retry logic for failed asset loads

---

## Phase 9: Documentation and Cleanup

### Task 9.1: Update Asset Documentation
**Action:** Documentation

1. Create or update asset documentation listing all new files

2. Document the new asset loading system

3. Add notes about jungle theme implementation

### Task 9.2: Code Cleanup
**Action:** Code review

1. Remove any unused imports

2. Clean up console.log statements

3. Ensure consistent code formatting

4. Add comments for complex sections

### Task 9.3: Create Production Deployment Notes
**Action:** Documentation

1. Document how to change asset URLs for production

2. Create checklist for production deployment

3. Note any CDN setup requirements

---

## Phase 10: Final Validation

### Task 10.1: Complete System Test
**Action:** End-to-end testing

1. Test the entire user flow from boot to gameplay

2. Verify all jungle theme elements are working

3. Check performance metrics

4. Test with multiple players in lobby

### Task 10.2: Performance Benchmarking
**Action:** Performance testing

1. Measure initial load times

2. Check memory usage with video backgrounds

3. Test frame rate stability

4. Verify no memory leaks during scene transitions

### Task 10.3: User Experience Validation
**Action:** UX review

1. Verify jungle theme is cohesive across all scenes

2. Check color contrast for accessibility

3. Ensure all text is readable

4. Validate that interactions feel natural

---

## Completion Checklist

- [ ] All asset directories created
- [ ] Express static serving configured
- [ ] All jungle assets generated and saved
- [ ] YAML configuration updated
- [ ] Database synced with new configuration
- [ ] BootScene updated with new asset loading
- [ ] All scene backgrounds updated to jungle theme
- [ ] Character cards updated with tribal aesthetic
- [ ] Stage cards updated with wooden frames and shields
- [ ] Player cards updated with tribal masks and nameplates
- [ ] All buttons updated to wooden style
- [ ] Audio integration tested
- [ ] Cross-browser testing completed
- [ ] Mobile responsiveness verified
- [ ] Performance optimization applied
- [ ] Documentation updated
- [ ] Final validation completed

---

## Post-Implementation Notes

After completing this task list, you should have:
- A fully functional jungle-themed UI
- Self-hosted asset serving via Express
- Scalable asset management system
- Improved visual cohesion across all scenes
- Enhanced user experience with thematic consistency

The system is designed to be easily extensible for future theme changes or additional assets.