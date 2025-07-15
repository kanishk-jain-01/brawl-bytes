/*
 * Integration Test: Scene ↔ GameState
 * -----------------------------------
 * Ensures CharacterSelectScene writes the chosen character into the global
 * store when the selection is confirmed.
 */

import { CharacterSelectScene } from '@/scenes/CharacterSelectScene';
import * as GameState from '@/state/GameState';
import type { CharacterType } from '@/utils/constants';

const CHOSEN: CharacterType = 'HEAVY_HITTER';

describe('CharacterSelectScene integration', () => {
  beforeEach(() => {
    GameState.resetState();
  });

  it('persists the selected character to GameState on confirm', () => {
    const scene = new CharacterSelectScene();

    // Manually inject minimal mocks to satisfy internal calls
    (scene as any).cameras = {
      main: {
        fadeOut: jest.fn(),
        once: jest.fn(),
      },
    };
    (scene as any).scene = { start: jest.fn() };

    // Pre-select a character
    (scene as any).selectedCharacter = CHOSEN;

    // Spy on updateState
    const spy = jest.spyOn(GameState, 'updateState');

    // Invoke confirmation logic
    (scene as any).confirmSelection();

    expect(spy).toHaveBeenCalledWith({ selectedCharacter: CHOSEN });
    expect(GameState.getState().selectedCharacter).toBe(CHOSEN);
  });
});
