/*
 * Global Game State
 * -----------------
 * Provides a lightweight, centralised store for sharing data between Phaser scenes
 * without relying on the built-in Registry (which resets when a new `Phaser.Game`
 * instance is created).
 *
 * Keep this file small and purely functional so that it remains tree-shakeable.
 */

import type { GameState } from '@/types/GameState';

const defaultState: GameState = {
  selectedCharacter: null,
  selectedStage: null,
};

let state: GameState = { ...defaultState };

/**
 * Returns a _copy_ of the current game state so external callers can't mutate it
 * directly.
 */
export function getState(): GameState {
  return { ...state };
}

/**
 * Shallow-merge updates into the existing state.
 */
export function updateState(partial: Partial<GameState>): void {
  state = { ...state, ...partial };
}

/**
 * Reset state back to defaults. Useful when returning to main menu or starting a
 * new session.
 */
export function resetState(): void {
  state = { ...defaultState };
}
