/*
 * Integration Test: Scene ↔ GameState
 * -----------------------------------
 * Ensures CharacterSelectScene writes the chosen character into the global
 * store when the selection is confirmed.
 */

import { CharacterSelectScene } from '@/scenes/CharacterSelectScene';
import * as GameState from '@/state/GameState';
import type { CharacterType } from '@/utils/constants';

const CHOSEN: CharacterType = 'TITAN';

describe('CharacterSelectScene integration', () => {
  beforeEach(() => {
    GameState.resetState();
  });

  it('persists the selected character to GameState on confirm', () => {
    const scene = new CharacterSelectScene();

    // Manually inject minimal mocks to satisfy internal calls
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (scene as any).cameras = {
      main: {
        fadeOut: jest.fn(),
        once: jest.fn(),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (scene as any).scene = { start: jest.fn() };

    // Pre-select a character
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (scene as any).selectedCharacter = CHOSEN;

    // Spy on updateState
    const spy = jest.spyOn(GameState, 'updateState');

    // Invoke confirmation logic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (scene as any).confirmSelection();

    expect(spy).toHaveBeenCalledWith({ selectedCharacter: CHOSEN });
    expect(GameState.getState().selectedCharacter).toBe(CHOSEN);
  });
});
