import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create loading progress bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(540, 330, 200, 50);

    const { width } = this.cameras.main;
    const { height } = this.cameras.main;
    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'Loading...',
      style: {
        font: '20px monospace',
        color: '#ffffff',
      },
    });
    loadingText.setOrigin(0.5, 0.5);

    // Update progress bar
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(550, 340, 180 * value, 30);
    });

    this.load.on('complete', () => {
      loadingText.setText('Brawl Bytes - Press any key to start');
    });

    // Load placeholder assets for now
    this.load.image(
      'logo',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzNzNkYyIvPgogIDx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QkI8L3RleHQ+Cjwvc3ZnPg=='
    );
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Add logo
    const logo = this.add.image(width / 2, height / 2 - 100, 'logo');
    logo.setScale(2);

    // Add title
    const title = this.add.text(width / 2, height / 2 + 50, 'BRAWL BYTES', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    // Add subtitle
    const subtitle = this.add.text(
      width / 2,
      height / 2 + 100,
      'Press any key to continue',
      {
        fontSize: '24px',
        color: '#cccccc',
        fontFamily: 'Arial, sans-serif',
      }
    );
    subtitle.setOrigin(0.5);

    // Make subtitle blink
    this.tweens.add({
      targets: subtitle,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    // Listen for any key press
    this.input.keyboard?.once('keydown', () => {
      console.log('Starting game...');
      // TODO: Transition to MenuScene when implemented
    });

    // Listen for click/touch
    this.input.once('pointerdown', () => {
      console.log('Starting game...');
      // TODO: Transition to MenuScene when implemented
    });
  }
}
