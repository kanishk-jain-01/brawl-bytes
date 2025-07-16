import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { getSocketManager } from '../utils/socket';

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  attack: boolean;
  special: boolean;
}

export class InputManager {
  private scene: Phaser.Scene;

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;

  private wasdKeys: Record<string, Phaser.Input.Keyboard.Key> = {};

  private actionKeys: Record<string, Phaser.Input.Keyboard.Key> = {};

  private inputEnabled = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupInput();
  }

  private setupInput(): void {
    // Arrow keys
    this.cursors = this.scene.input.keyboard?.createCursorKeys() || null;

    // WASD keys
    if (this.scene.input.keyboard) {
      this.wasdKeys = {
        W: this.scene.input.keyboard.addKey('W'),
        A: this.scene.input.keyboard.addKey('A'),
        S: this.scene.input.keyboard.addKey('S'),
        D: this.scene.input.keyboard.addKey('D'),
      };

      // Action keys
      this.actionKeys = {
        SPACE: this.scene.input.keyboard.addKey('SPACE'),
        X: this.scene.input.keyboard.addKey('X'),
        Z: this.scene.input.keyboard.addKey('Z'),
        C: this.scene.input.keyboard.addKey('C'),
        ESC: this.scene.input.keyboard.addKey('ESC'),
      };
    }
  }

  public setupEscapeHandler(callback: () => void): void {
    this.actionKeys.ESC?.on('down', callback);
  }

  public getInputState(): InputState {
    if (!this.inputEnabled || !this.cursors) {
      return {
        left: false,
        right: false,
        up: false,
        down: false,
        attack: false,
        special: false,
      };
    }

    return {
      left: this.cursors.left.isDown || this.wasdKeys.A?.isDown || false,
      right: this.cursors.right.isDown || this.wasdKeys.D?.isDown || false,
      up:
        this.cursors.up.isDown ||
        this.wasdKeys.W?.isDown ||
        this.actionKeys.SPACE?.isDown ||
        false,
      down: this.cursors.down.isDown || this.wasdKeys.S?.isDown || false,
      attack: this.actionKeys.X?.isDown || false,
      special: this.actionKeys.Z?.isDown || false,
    };
  }

  public handlePlayerInput(player: Player): void {
    if (!this.inputEnabled) return;

    const inputState = this.getInputState();
    player.updateInputState(inputState);

    // Broadcast input to other players via networking
    InputManager.broadcastInput(inputState);
  }

  private static broadcastInput(inputState: InputState): void {
    const socketManager = getSocketManager();
    if (!socketManager) return;

    // Only broadcast significant input changes to reduce network traffic
    if (inputState.attack || inputState.special || inputState.up) {
      let inputType: string;
      if (inputState.attack) {
        inputType = 'attack';
      } else if (inputState.special) {
        inputType = 'special';
      } else {
        inputType = 'jump';
      }

      socketManager.emit('playerInput', {
        inputType,
        timestamp: Date.now(),
      });
    }
  }

  public enableInput(): void {
    this.inputEnabled = true;
    this.scene.input.keyboard?.enableGlobalCapture();
  }

  public disableInput(): void {
    this.inputEnabled = false;
    this.scene.input.keyboard?.disableGlobalCapture();
  }

  public isInputEnabled(): boolean {
    return this.inputEnabled;
  }

  public destroy(): void {
    // Cleanup if needed
    this.cursors = null;
    this.wasdKeys = {};
    this.actionKeys = {};
  }
}
