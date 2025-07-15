/*
 * Tests: GameState store
 * ----------------------
 * Verifies that the lightweight global store behaves predictably.
 */

import {
  getState,
  updateState,
  resetState,
} from '@/state/GameState';
import type { CharacterType } from '@/utils/constants';

const SAMPLE_CHARACTER: CharacterType = 'FAST_LIGHTWEIGHT';

describe('GameState store', () => {
  beforeEach(() => {
    resetState();
  });

  it('returns a clone of the internal state', () => {
    const snapshot = getState();
    snapshot.selectedCharacter = SAMPLE_CHARACTER;

    // Internal state should remain unchanged
    expect(getState().selectedCharacter).toBeNull();
  });

  it('shallow-merges updates via updateState()', () => {
    updateState({ selectedCharacter: SAMPLE_CHARACTER });

    expect(getState().selectedCharacter).toBe(SAMPLE_CHARACTER);
  });

  it('resetState() restores default values', () => {
    updateState({ selectedCharacter: SAMPLE_CHARACTER });
    expect(getState().selectedCharacter).toBe(SAMPLE_CHARACTER);

    resetState();
    expect(getState().selectedCharacter).toBeNull();
  });
}); 